const express = require('express');
const OrderService = require('../services/OrderService');
const PaymentOrchestrator = require('../services/PaymentOrchestrator');
const ReceiptOcrService = require('../services/ReceiptOcrService');
const MessagingService = require('../services/MessagingService');
const asyncHandler = require('../middleware/asyncHandler');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { memoryUpload, uploadBufferToR2 } = require('../config/r2Storage');
const { authenticateJWT } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { requireIdempotency } = require('../middleware/idempotency');

const router = express.Router();

router.post(
  '/quote',
  asyncHandler(async (req, res) => {
    try {
      const quote = await OrderService.calculateCartQuote({
        items: req.body.items,
        deliveryAddress: req.body.deliveryAddress,
        couponCode: req.body.couponCode
      });
      return successResponse(res, quote, 200);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  })
);

router.post(
  '/',
  authenticateJWT,
  requireRole('buyer'),
  requireIdempotency(),
  asyncHandler(async (req, res) => {
    try {
      const result = await OrderService.createSplitOrder({
        buyer: req.user,
        items: req.body.items,
        deliveryAddress: req.body.deliveryAddress,
        paymentMethod: req.body.paymentMethod,
        couponCode: req.body.couponCode
      });

      let payment = null;
      if (req.body.paymentMethod === 'CHAPA') {
        payment = await PaymentOrchestrator.initializeChapaPayment({
          masterOrder: result.masterOrder,
          buyer: req.user
        });
      }

      return successResponse(res, { ...result, payment }, 201);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  })
);

router.post(
  '/:masterOrderId/manual-receipt',
  authenticateJWT,
  requireRole('buyer'),
  requireIdempotency(),
  memoryUpload.single('receipt'),
  asyncHandler(async (req, res) => {
    try {
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

      const verification = await OrderService.verifyManualReceipt({
        buyerId: req.user.id,
        masterOrderId: req.params.masterOrderId,
        receiptImageUrl,
        ocrResult
      });

      // Asynchronously notify Admin Telegram Group with Inline Keyboards (Approve / Reject)
      MessagingService.sendAdminReceiptApproval({
        masterOrder: verification.masterOrder,
        receiptImageUrl,
        expectedAmount: verification.masterOrder.totalAmount,
        buyer: req.user
      }).catch(() => {});

      return successResponse(
        res,
        {
          needsReview: verification.needsReview,
          ocrResult,
          masterOrder: verification.masterOrder,
          vendorOrders: verification.vendorOrders
        },
        verification.needsReview ? 202 : 200
      );
    } catch (error) {
      return errorResponse(res, error.message, error.status || 500);
    }
  })
);

module.exports = router;
