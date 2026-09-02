const express = require('express');
const ReceiptOcrService = require('../services/ReceiptOcrService');
const OrderService = require('../services/OrderService');
const asyncHandler = require('../middleware/asyncHandler');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { memoryUpload, uploadBufferToR2 } = require('../config/r2Storage');
const { authenticateJWT } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.post(
  '/:masterOrderId/receipt',
  authenticateJWT,
  requireRole('buyer'),
  memoryUpload.single('receipt'),
  asyncHandler(async (req, res) => {
    let receiptImageUrl = req.body.receiptImageUrl;
    if (req.file) {
      const uploaded = await uploadBufferToR2({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        folder: 'receipts'
      });
      receiptImageUrl = uploaded.url;
    }

    const ocrResult = await ReceiptOcrService.parseReceipt({
      file: req.file,
      rawText: req.body.receiptText
    });

    try {
      const verification = await OrderService.verifyManualReceipt({
        buyerId: req.user.id,
        masterOrderId: req.params.masterOrderId,
        receiptImageUrl,
        ocrResult
      });

      return successResponse(
        res,
        { ocrResult, ...verification },
        verification.needsReview ? 202 : 200
      );
    } catch (error) {
      return errorResponse(res, error.message, error.status || 500);
    }
  })
);

module.exports = router;
