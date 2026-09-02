const fetch = require('node-fetch');
const FormData = require('form-data');

const OCR_URL = process.env.OCR_SERVICE_URL || process.env.RECEIPT_PARSER_URL || process.env.PYTHON_OCR_URL || 'http://localhost:8000/parse-receipt';

const normalizeOcrResult = (data = {}) => {
  const ref = data.ref || data.referenceNo || data.reference || data.transactionId || null;
  const amount = data.amount !== undefined ? Number(data.amount) : Number(data.parsedAmount);

  return {
    ref,
    amount: Number.isFinite(amount) ? amount : null,
    date: data.date || data.timestamp || null,
    bankName: data.bankName || data.bank || null,
    confidence: Number(data.confidence || data.confidenceScore || 0),
    status: data.status || (ref && Number.isFinite(amount) ? 'PARSED_SUCCESSFULLY' : 'NEEDS_MANUAL_REVIEW'),
    rawText: data.rawText || ''
  };
};

class ReceiptOcrService {
  static async parseReceipt({ file, rawText }) {
    try {
      const form = new FormData();

      if (file && file.buffer) {
        form.append('file', file.buffer, {
          filename: file.originalname || 'receipt.png',
          contentType: file.mimetype || 'application/octet-stream'
        });
      }

      if (rawText) {
        form.append('rawText', rawText);
      }

      const response = await fetch(OCR_URL, {
        method: 'POST',
        headers: form.getHeaders(),
        body: form,
        timeout: Number(process.env.OCR_TIMEOUT_MS || 12000)
      });

      if (!response.ok) {
        throw new Error(`OCR service returned HTTP ${response.status}`);
      }

      const data = await response.json();
      return normalizeOcrResult(data);
    } catch (error) {
      return {
        ref: null,
        amount: null,
        date: null,
        bankName: null,
        confidence: 0,
        status: 'NEEDS_MANUAL_REVIEW',
        rawText: rawText || '',
        error: error.message
      };
    }
  }
}

module.exports = ReceiptOcrService;
