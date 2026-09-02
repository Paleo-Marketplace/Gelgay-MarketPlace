const express = require('express');
const Coupon = require('../models/Coupon');
const asyncHandler = require('../middleware/asyncHandler');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { authenticateJWT } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

// Customer: Validate coupon code
router.post(
  '/validate',
  asyncHandler(async (req, res) => {
    const { code, subtotal } = req.body;
    if (!code) {
      return errorResponse(res, 'Coupon code is required', 400);
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) {
      return errorResponse(res, 'Invalid or expired coupon code', 404);
    }

    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return errorResponse(res, 'This coupon has expired', 400);
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return errorResponse(res, 'Coupon usage limit reached', 400);
    }

    const orderSubtotal = Number(subtotal || 0);
    if (coupon.minOrderAmount && orderSubtotal < coupon.minOrderAmount) {
      return errorResponse(res, `Minimum order of ${coupon.minOrderAmount} ETB required for code ${coupon.code}`, 400);
    }

    const discountAmount = coupon.calculateDiscount(orderSubtotal);

    return successResponse(res, {
      valid: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        description: coupon.description
      }
    });
  })
);

// Admin: List all coupons
router.get(
  '/',
  authenticateJWT,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    return successResponse(res, { coupons });
  })
);

// Admin: Create new coupon
router.post(
  '/',
  authenticateJWT,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { code, description, discountType, discountValue, minOrderAmount, maxDiscountAmount, usageLimit, expiresAt } = req.body;
    if (!code || discountValue === undefined) {
      return errorResponse(res, 'code and discountValue are required', 400);
    }

    try {
      const coupon = await Coupon.create({
        code: code.toUpperCase().trim(),
        description,
        discountType: discountType || 'percentage',
        discountValue: Number(discountValue),
        minOrderAmount: Number(minOrderAmount || 0),
        maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : 10000,
        usageLimit: usageLimit ? Number(usageLimit) : 100,
        expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true
      });

      return successResponse(res, { coupon }, 201);
    } catch (error) {
      if (error.code === 11000) {
        return errorResponse(res, 'Coupon code already exists', 409);
      }
      throw error;
    }
  })
);

// Admin: Toggle active / delete coupon
router.patch(
  '/:id/toggle',
  authenticateJWT,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return errorResponse(res, 'Coupon not found', 404);
    coupon.isActive = !coupon.isActive;
    await coupon.save();
    return successResponse(res, { coupon });
  })
);

router.delete(
  '/:id',
  authenticateJWT,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const deleted = await Coupon.findByIdAndDelete(req.params.id);
    if (!deleted) return errorResponse(res, 'Coupon not found', 404);
    return successResponse(res, {}, 200, 'Coupon deleted');
  })
);

module.exports = router;
