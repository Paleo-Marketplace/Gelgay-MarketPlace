const express = require('express');
const Product = require('../models/Product');
const User = require('../models/User');
const Review = require('../models/Review');
const Vendor = require('../models/Vendor');
const SearchService = require('../services/SearchService');
const asyncHandler = require('../middleware/asyncHandler');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { authenticateJWT, optionalAuthenticateJWT } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { enforceVendorIsolation, rejectClientVendorId } = require('../middleware/vendorIsolation');
const { memoryUpload, uploadBufferToR2 } = require('../config/r2Storage');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    if (req.query.q || req.query.search) {
      const result = await SearchService.searchProducts(req.query);
      return successResponse(res, result);
    }

    const query = {
      stock: { $gt: 0 },
      isArchived: { $ne: true },
      isPublished: true
    };
    if (req.query.category && req.query.category !== 'All') query.category = req.query.category;
    if (req.query.vendorId) query.vendorId = req.query.vendorId;

    const products = await Product.find(query)
      .populate('vendorId')
      .sort({ createdAt: -1 })
      .limit(Number(req.query.limit || 48));

    return successResponse(res, { products });
  })
);

// ---------------- Wishlist / Liked Products ----------------

router.get(
  '/wishlist/items',
  optionalAuthenticateJWT,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      return successResponse(res, { wishlistIds: [], products: [], count: 0 });
    }
    const user = await User.findById(req.user.id).populate({
      path: 'wishlist',
      populate: { path: 'vendorId' }
    });
    if (!user) {
      return successResponse(res, { wishlistIds: [], products: [], count: 0 });
    }
    const products = (user.wishlist || []).filter(Boolean);
    const wishlistIds = products.map((p) => p._id.toString());
    return successResponse(res, { wishlistIds, products, count: wishlistIds.length });
  })
);

router.post(
  '/wishlist/toggle',
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const { productId } = req.body;
    if (!productId) {
      return errorResponse(res, 'productId is required', 400);
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    const currentList = (user.wishlist || []).map((id) => id.toString());
    const strId = String(productId);
    const index = currentList.indexOf(strId);
    let isWishlisted = false;

    if (index > -1) {
      user.wishlist.splice(index, 1);
      isWishlisted = false;
    } else {
      user.wishlist.push(productId);
      isWishlisted = true;
    }

    await user.save();
    const updatedIds = (user.wishlist || []).map((id) => id.toString());

    return successResponse(
      res,
      {
        isWishlisted,
        wishlistIds: updatedIds,
        count: updatedIds.length
      },
      200,
      isWishlisted ? 'Added to liked products' : 'Removed from liked products'
    );
  })
);

router.post(
  '/:id/wishlist',
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const productId = req.params.id;
    const user = await User.findById(req.user.id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    const currentList = (user.wishlist || []).map((id) => id.toString());
    const strId = String(productId);
    const index = currentList.indexOf(strId);
    let isWishlisted = false;

    if (index > -1) {
      user.wishlist.splice(index, 1);
      isWishlisted = false;
    } else {
      user.wishlist.push(productId);
      isWishlisted = true;
    }

    await user.save();
    const updatedIds = (user.wishlist || []).map((id) => id.toString());

    return successResponse(
      res,
      {
        isWishlisted,
        wishlistIds: updatedIds,
        count: updatedIds.length
      },
      200,
      isWishlisted ? 'Added to liked products' : 'Removed from liked products'
    );
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id).populate('vendorId');
    if (!product || !product.isPublished) {
      return errorResponse(res, 'Product not found', 404);
    }

    return successResponse(res, { product });
  })
);

router.post(
  '/',
  authenticateJWT,
  requireRole('vendor'),
  rejectClientVendorId,
  enforceVendorIsolation,
  asyncHandler(async (req, res) => {
    const { title, description, price, stock, category, images, location } = req.body;
    if (!title || price === undefined || stock === undefined) {
      return errorResponse(res, 'title, price and stock are required', 400);
    }

    const product = await Product.create({
      vendorId: req.vendorId,
      title,
      description,
      price: Number(price),
      stock: Number(stock),
      reservedStock: 0,
      category,
      images: Array.isArray(images) ? images : [],
      location: location || undefined
    });

    return successResponse(res, { product }, 201);
  })
);

router.put(
  '/:id',
  authenticateJWT,
  requireRole('vendor'),
  rejectClientVendorId,
  enforceVendorIsolation,
  asyncHandler(async (req, res) => {
    const allowed = ['title', 'description', 'price', 'stock', 'category', 'images', 'location', 'isPublished'];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    const existing = await Product.findOne({ _id: req.params.id, vendorId: req.vendorId });
    if (!existing) {
      return errorResponse(res, 'Product not found for this vendor', 404);
    }

    if (req.body.stock !== undefined) {
      const newStock = Number(req.body.stock);
      if (!Number.isFinite(newStock) || newStock < 0) {
        return errorResponse(res, 'Stock must be a non-negative number', 400);
      }
      const reserved = existing.reservedStock || 0;
      if (newStock < reserved) {
        return errorResponse(res, `Cannot set stock below currently reserved stock (${reserved})`, 400);
      }
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, vendorId: req.vendorId },
      update,
      { new: true, runValidators: true }
    );

    if (!product) {
      return errorResponse(res, 'Product not found for this vendor', 404);
    }

    return successResponse(res, { product });
  })
);

router.post(
  '/:id/images',
  authenticateJWT,
  requireRole('vendor'),
  enforceVendorIsolation,
  memoryUpload.single('image'),
  asyncHandler(async (req, res) => {
    const product = await Product.findOne({ _id: req.params.id, vendorId: req.vendorId });
    if (!product) {
      return errorResponse(res, 'Product not found for this vendor', 404);
    }

    if (!req.file) {
      return errorResponse(res, 'image file is required', 400);
    }

    const uploaded = await uploadBufferToR2({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      folder: `vendors/${req.vendorId}/products`
    });

    product.images.push(uploaded.url);
    await product.save();

    return successResponse(res, { imageUrl: uploaded.url, product }, 201);
  })
);

router.post(
  '/upload-image',
  authenticateJWT,
  requireRole('vendor', 'buyer'),
  memoryUpload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return errorResponse(res, 'Image file is required', 400);
    }

    const uploaded = await uploadBufferToR2({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      folder: `uploads/${req.user.id}/products`
    });

    return successResponse(res, { imageUrl: uploaded.url }, 201);
  })
);

// ---------------- Product & Vendor Reviews ----------------

router.get(
  '/:id/reviews',
  asyncHandler(async (req, res) => {
    const reviews = await Review.find({ productId: req.params.id })
      .populate('buyerId', 'displayName avatar location')
      .sort({ createdAt: -1 });

    const avgRating = reviews.length
      ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
      : 5.0;

    return successResponse(res, {
      reviews,
      count: reviews.length,
      averageRating: avgRating
    });
  })
);

router.post(
  '/:id/reviews',
  authenticateJWT,
  requireRole('buyer', 'admin'),
  asyncHandler(async (req, res) => {
    const { rating, comment, title, aspects } = req.body;
    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      return errorResponse(res, 'Rating must be between 1 and 5', 400);
    }
    if (!comment || !comment.trim()) {
      return errorResponse(res, 'Review comment is required', 400);
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return errorResponse(res, 'Product not found', 404);
    }

    const review = await Review.create({
      productId: product._id,
      vendorId: product.vendorId,
      buyerId: req.user.id,
      rating: Number(rating),
      title: title?.trim(),
      comment: comment.trim(),
      aspects: aspects || { itemAccuracy: 5, communication: 5, deliveryHandoff: 5 },
      verifiedPurchase: true
    });

    // Recalculate vendor average rating
    const allVendorReviews = await Review.find({ vendorId: product.vendorId });
    if (allVendorReviews.length > 0) {
      const avg = Number((allVendorReviews.reduce((sum, r) => sum + r.rating, 0) / allVendorReviews.length).toFixed(2));
      await Vendor.findByIdAndUpdate(product.vendorId, {
        rating: { average: avg, count: allVendorReviews.length }
      });
    }

    return successResponse(res, { review }, 201, 'Review submitted successfully');
  })
);

router.delete(
  '/:id',
  authenticateJWT,
  requireRole('vendor'),
  rejectClientVendorId,
  enforceVendorIsolation,
  asyncHandler(async (req, res) => {
    const deleted = await Product.findOneAndUpdate(
      { _id: req.params.id, vendorId: req.vendorId },
      { isPublished: false, isArchived: true },
      { new: true }
    );
    if (!deleted) {
      return errorResponse(res, 'Product not found for this vendor', 404);
    }
    return successResponse(res, {}, 200, 'Product archived successfully');
  })
);

module.exports = router;
