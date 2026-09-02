const express = require('express');
const OrderService = require('../services/OrderService');
const asyncHandler = require('../middleware/asyncHandler');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { authenticateJWT } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ESCROW_STATUS } = require('../constants/orderStates');

const router = express.Router();

router.post(
  '/vendor-orders/:vendorOrderId/dispute',
  authenticateJWT,
  requireRole('buyer', 'admin'),
  asyncHandler(async (req, res) => {
    try {
      const vendorOrder = await OrderService.transitionVendorOrder(
        req.params.vendorOrderId,
        ESCROW_STATUS.DISPUTED,
        req.user
      );
      return successResponse(res, { vendorOrder });
    } catch (error) {
      return errorResponse(res, error.message, error.status || 400);
    }
  })
);

router.post(
  '/vendor-orders/:vendorOrderId/release',
  authenticateJWT,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    try {
      const vendorOrder = await OrderService.releaseVendorEscrow(req.params.vendorOrderId);
      return successResponse(res, { vendorOrder });
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  })
);

module.exports = router;
