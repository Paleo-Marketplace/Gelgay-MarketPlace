const express = require('express');
const MasterOrder = require('../models/MasterOrder');
const VendorOrder = require('../models/VendorOrder');
const OrderService = require('../services/OrderService');
const asyncHandler = require('../middleware/asyncHandler');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { authenticateJWT } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ESCROW_STATUS } = require('../constants/orderStates');

const router = express.Router();

// List user master orders
router.get(
  '/',
  authenticateJWT,
  requireRole('buyer', 'admin'),
  asyncHandler(async (req, res) => {
    const query = req.user.role === 'admin' && req.query.all === 'true' ? {} : { buyerId: req.user.id };
    const masterOrders = await MasterOrder.find(query)
      .populate('vendorOrderIds')
      .sort({ createdAt: -1 });
    return successResponse(res, { masterOrders });
  })
);

// Get single master order details with RBAC ownership checks
router.get(
  '/:id',
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const masterOrder = await MasterOrder.findById(req.params.id).populate('vendorOrderIds');
    if (!masterOrder) {
      return errorResponse(res, 'Order not found', 404);
    }

    const ownsOrder = masterOrder.buyerId.toString() === req.user.id;
    const vendorOrderVisible =
      req.user.role === 'vendor' &&
      masterOrder.vendorOrderIds.some(
        (vendorOrder) => vendorOrder.vendorId.toString() === req.user.vendorId
      );

    if (!ownsOrder && !vendorOrderVisible && req.user.role !== 'admin') {
      return errorResponse(res, 'Unauthorized order access', 403);
    }

    return successResponse(res, { masterOrder });
  })
);

// Buyer confirms delivery of a specific vendor package (automatically triggers escrow disbursement to seller)
router.post(
  '/vendor-orders/:vendorOrderId/confirm-delivery',
  authenticateJWT,
  requireRole('buyer', 'admin'),
  asyncHandler(async (req, res) => {
    const vendorOrder = await VendorOrder.findById(req.params.vendorOrderId);
    if (!vendorOrder) {
      return errorResponse(res, 'Vendor order not found', 404);
    }

    if (req.user.role !== 'admin') {
      const masterOrder = await MasterOrder.findById(vendorOrder.masterOrderId);
      if (!masterOrder || masterOrder.buyerId.toString() !== req.user.id) {
        return errorResponse(res, 'Only the buyer can confirm delivery for this order', 403);
      }
    }

    const { otp, deliveryOtp } = req.body;
    const providedOtp = otp || deliveryOtp;
    if (vendorOrder.deliveryOtp && providedOtp && String(providedOtp).trim() !== String(vendorOrder.deliveryOtp).trim() && req.user.role !== 'admin') {
      return errorResponse(res, 'Invalid delivery verification OTP PIN', 400);
    }

    try {
      // 1. Transition state from DISPATCHED -> DELIVERED
      if (vendorOrder.escrowStatus !== ESCROW_STATUS.DELIVERED && vendorOrder.escrowStatus !== ESCROW_STATUS.FUNDS_RELEASED) {
        await OrderService.transitionVendorOrder(
          req.params.vendorOrderId,
          ESCROW_STATUS.DELIVERED,
          req.user
        );
      }

      // 2. Automatically disburse net payout (subtotal minus platform fee) directly into seller's available balance
      const released = await OrderService.releaseVendorEscrow(req.params.vendorOrderId);
      return successResponse(res, { vendorOrder: released, autoReleased: true });
    } catch (error) {
      return errorResponse(res, error.message, error.status || 400);
    }
  })
);

// Buyer, Vendor, or Admin cancels a specific vendor package
router.post(
  '/vendor-orders/:vendorOrderId/cancel',
  authenticateJWT,
  asyncHandler(async (req, res) => {
    try {
      const cancelled = await OrderService.cancelVendorOrder(req.params.vendorOrderId, req.user);
      return successResponse(res, { vendorOrder: cancelled });
    } catch (error) {
      return errorResponse(res, error.message, error.status || 400);
    }
  })
);

module.exports = router;
