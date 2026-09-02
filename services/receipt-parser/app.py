import logging
import re
from typing import Any, Dict, Optional

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from ethiobank_receipts import parse_receipt, parse_text  # type: ignore
except Exception:  # pragma: no cover - library is provided in production images
    parse_receipt = None
    parse_text = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("paleo-receipt-ocr")

app = FastAPI(
    title="ገልጋይ (Gelgay) Ethiopian Bank Receipt OCR",
    description="FastAPI OCR service that parses CBE and Telebirr receipt screenshots for ገልጋይ manual bank-transfer verification.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ReceiptParseResponse(BaseModel):
    success: bool = True
    ref: Optional[str] = Field(None, description="Bank transaction reference")
    amount: Optional[float] = Field(None, description="Receipt amount in ETB")
    date: Optional[str] = Field(None, description="Receipt date if detected")
    bankName: Optional[str] = None
    confidence: float = 0
    status: str = "NEEDS_MANUAL_REVIEW"
    rawText: str = ""


def _normalize_library_result(result: Any) -> Dict[str, Any]:
    if not result:
        return {}
    if hasattr(result, "model_dump"):
        result = result.model_dump()
    if not isinstance(result, dict):
        return {}

    amount = result.get("amount") or result.get("parsed_amount")
    try:
        amount = float(amount) if amount is not None else None
    except (TypeError, ValueError):
        amount = None

    return {
        "ref": result.get("ref") or result.get("referenceNo") or result.get("reference") or result.get("transaction_id"),
        "amount": amount,
        "date": result.get("date") or result.get("timestamp"),
        "bankName": result.get("bankName") or result.get("bank"),
        "confidence": float(result.get("confidence") or result.get("confidenceScore") or 0),
        "rawText": result.get("rawText") or result.get("text") or "",
    }


def _regex_parse(text: str) -> Dict[str, Any]:
    # 1. Reference matching (CBE, Telebirr, Dashen, Awash, BOA, general Txn ID)
    ref_match = re.search(
        r"\b(CBE[A-Z0-9]{6,16}|FT[0-9]{8,16}|TXN[A-Z0-9]{6,16}|DSH[A-Z0-9]{6,16}|AW[0-9]{8,16}|TB[A-Z0-9]{6,14})\b"
        r"|(?:ref(?:erence)?(?:\s*no|\s*number)?|txn(?:\s*id)?|transaction\s*id|receipt\s*no)\s*[:#-]?\s*([A-Z0-9]{6,20})",
        text,
        re.IGNORECASE,
    )

    # 2. Amount matching (Supports comma separators, decimals, and preceding/trailing currency symbols)
    amount_match = re.search(
        r"(?:amount|paid|transferred|total|etb|birr|sum)\s*[:#-]?\s*(?:ETB|Birr)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]{1,9}(?:\.[0-9]{1,2})?)"
        r"|([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]{1,9}(?:\.[0-9]{1,2})?)\s*(?:ETB|Birr)",
        text,
        re.IGNORECASE,
    )

    # 3. Date matching (YYYY-MM-DD, DD/MM/YYYY, or standard ISO formats)
    date_match = re.search(
        r"\b(20[0-9]{2}[-/][01]?[0-9][-/][0-3]?[0-9]|[0-3]?[0-9][-/][01]?[0-9][-/]20[0-9]{2})\b",
        text,
    )

    ref = None
    if ref_match:
        ref = (ref_match.group(1) or ref_match.group(2) or "").upper()

    amount = None
    if amount_match:
        value = (amount_match.group(1) or amount_match.group(2) or "").replace(",", "")
        try:
            amount = float(value)
        except ValueError:
            amount = None

    lowered = text.lower()
    if "telebirr" in lowered:
        bank_name = "Telebirr"
    elif "dashen" in lowered:
        bank_name = "Dashen Bank"
    elif "awash" in lowered:
        bank_name = "Awash Bank"
    elif "abyssinia" in lowered or "boa" in lowered:
        bank_name = "Bank of Abyssinia"
    elif "cbe" in lowered or "commercial bank" in lowered:
        bank_name = "Commercial Bank of Ethiopia"
    elif "wegagen" in lowered:
        bank_name = "Wegagen Bank"
    elif "hibret" in lowered or "united" in lowered:
        bank_name = "Hibret Bank"
    elif "nib" in lowered:
        bank_name = "Nib International Bank"
    else:
        bank_name = None

    confidence = 0.95 if ref and amount and bank_name else (0.85 if ref and amount else 0.35)
    return {
        "ref": ref,
        "amount": amount,
        "date": date_match.group(1) if date_match else None,
        "bankName": bank_name,
        "confidence": confidence,
        "rawText": text,
    }


async def _parse_file(file: UploadFile) -> Dict[str, Any]:
    content = await file.read()
    if parse_receipt:
        try:
            return _normalize_library_result(parse_receipt(content, filename=file.filename))
        except Exception as exc:
            logger.warning("ethiobank-receipts parse_receipt failed: %s", exc)

    try:
        decoded = content.decode("utf-8", errors="ignore")
    except Exception:
        decoded = ""
    return _regex_parse(decoded)


def _parse_text(text: str) -> Dict[str, Any]:
    if parse_text:
        try:
            return _normalize_library_result(parse_text(text))
        except Exception as exc:
            logger.warning("ethiobank-receipts parse_text failed: %s", exc)
    return _regex_parse(text)


@app.get("/health")
def health_check():
    return {
        "status": "online",
        "service": "ገልጋይ (Gelgay) OCR",
        "library": "ethiobank-receipts" if parse_receipt or parse_text else "regex-fallback",
    }


@app.post("/parse-receipt", response_model=ReceiptParseResponse)
async def parse_receipt_endpoint(
    file: Optional[UploadFile] = File(None),
    rawText: Optional[str] = Form(None),
):
    if file:
        parsed = await _parse_file(file)
    elif rawText:
        parsed = _parse_text(rawText)
    else:
        parsed = {}

    status = "PARSED_SUCCESSFULLY" if parsed.get("ref") and parsed.get("amount") else "NEEDS_MANUAL_REVIEW"
    return ReceiptParseResponse(
        success=True,
        ref=parsed.get("ref"),
        amount=parsed.get("amount"),
        date=parsed.get("date"),
        bankName=parsed.get("bankName"),
        confidence=float(parsed.get("confidence") or 0),
        status=status,
        rawText=parsed.get("rawText") or rawText or "",
    )
