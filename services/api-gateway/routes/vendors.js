const express = require('express');
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const asyncHandler = require('../middleware/asyncHandler');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const router = express.Router();

// Public: List verified / active vendors
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { kycStatus = 'approved', limit = 20, page = 1 } = req.query;
    const query = { kycStatus };

    const vendors = await Vendor.find(query)
      .populate('userId', 'displayName avatar email location bio')
      .sort({ 'rating.average': -1, 'rating.count': -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Vendor.countDocuments(query);

    return successResponse(res, {
      vendors,
      total,
      page: Number(page),
      limit: Number(limit)
    });
  })
);

// Public: Get featured top-rated vendors
router.get(
  '/featured',
  asyncHandler(async (req, res) => {
    const vendors = await Vendor.find({ kycStatus: 'approved' })
      .populate('userId', 'displayName avatar email location bio')
      .sort({ 'rating.average': -1, 'rating.count': -1 })
      .limit(6);

    return successResponse(res, { vendors });
  })
);

// Public: Get single vendor profile with their active products
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const vendor = await Vendor.findById(req.params.id)
      .populate('userId', 'displayName avatar email location bio');

    if (!vendor) {
      return errorResponse(res, 'Vendor not found', 404);
    }

    const products = await Product.find({ vendorId: vendor._id, isPublished: true })
      .sort({ createdAt: -1 });

    return successResponse(res, {
      vendor,
      products
    });
  })
);

module.exports = router;
