const express = require('express');
const VendorOrder = require('../models/VendorOrder');
const OrderService = require('../services/OrderService');
const asyncHandler = require('../middleware/asyncHandler');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { memoryUpload, uploadBufferToR2 } = require('../config/r2Storage');
const { ESCROW_STATUS } = require('../constants/orderStates');

const router = express.Router();

const COURIER_WEBHOOK_SECRET = process.env.COURIER_WEBHOOK_SECRET;
if (!COURIER_WEBHOOK_SECRET) {
  console.error('[FATAL] COURIER_WEBHOOK_SECRET environment variable is missing.');
  process.exit(1);
}

const requireCourierSecret = (req, res, next) => {
  const provided = req.get('x-courier-secret') || req.query.secret;
  if (!provided || provided !== COURIER_WEBHOOK_SECRET) {
    return errorResponse(res, 'Invalid or missing courier secret header (x-courier-secret)', 401);
  }
  return next();
};

router.get(
  '/vendor-orders/:vendorOrderId',
  requireCourierSecret,
  asyncHandler(async (req, res) => {
    const vendorOrder = await VendorOrder.findById(req.params.vendorOrderId).populate('masterOrderId vendorId');
    if (!vendorOrder) return errorResponse(res, 'Vendor order not found', 404);
    return successResponse(res, { vendorOrder });
  })
);

router.post(
  '/vendor-orders/:vendorOrderId/proof-of-delivery',
  requireCourierSecret,
  memoryUpload.single('proof'),
  asyncHandler(async (req, res) => {
    let proofOfDeliveryUrl = req.body.proofOfDeliveryUrl;
    if (req.file) {
      const uploaded = await uploadBufferToR2({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        folder: 'proof-of-delivery'
      });
      proofOfDeliveryUrl = uploaded.url;
    }

    const vendorOrder = await VendorOrder.findById(req.params.vendorOrderId);
    if (!vendorOrder) return errorResponse(res, 'Vendor order not found', 404);

    const { otp, deliveryOtp } = req.body;
    const providedOtp = otp || deliveryOtp;
    if (vendorOrder.deliveryOtp && providedOtp && String(providedOtp).trim() !== String(vendorOrder.deliveryOtp).trim()) {
      return errorResponse(res, 'Invalid delivery verification OTP PIN', 400);
    }

    vendorOrder.proofOfDeliveryUrl = proofOfDeliveryUrl;
    await vendorOrder.save();

    try {
      const updated = await OrderService.transitionVendorOrder(
        req.params.vendorOrderId,
        ESCROW_STATUS.DELIVERED,
        { role: 'courier' }
      );
      return successResponse(res, { vendorOrder: updated }, 201);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  })
);

module.exports = router;
