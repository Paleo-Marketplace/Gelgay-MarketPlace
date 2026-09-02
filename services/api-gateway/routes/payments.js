const express = require('express');
const PaymentOrchestrator = require('../services/PaymentOrchestrator');
const asyncHandler = require('../middleware/asyncHandler');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const router = express.Router();

router.post(
  '/chapa/webhook',
  asyncHandler(async (req, res) => {
    const signature = req.get('chapa-signature') || req.get('x-chapa-signature');
    if (!PaymentOrchestrator.verifyChapaSignature(req.rawBody, signature)) {
      return errorResponse(res, 'Invalid Chapa webhook signature', 401);
    }

    try {
      const result = await PaymentOrchestrator.handleChapaWebhook(req.body);
      return successResponse(res, { paid: result.paid, idempotent: result.idempotent || false });
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  })
);

router.get(
  '/chapa/verify/:txRef',
  asyncHandler(async (req, res) => {
    try {
      const result = await PaymentOrchestrator.verifyChapaTransaction(req.params.txRef);
      return successResponse(res, result);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  })
);

module.exports = router;
