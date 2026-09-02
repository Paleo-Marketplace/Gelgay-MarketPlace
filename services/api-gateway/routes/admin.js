const express = require('express');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const MasterOrder = require('../models/MasterOrder');
const VendorOrder = require('../models/VendorOrder');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Coupon = require('../models/Coupon');
const Review = require('../models/Review');
const OrderService = require('../services/OrderService');
const asyncHandler = require('../middleware/asyncHandler');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { authenticateJWT } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ESCROW_STATUS } = require('../constants/orderStates');

const router = express.Router();

router.use(authenticateJWT, requireRole('admin'));

// ---------------- Dashboard Analytics ----------------
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const [totalUsers, totalVendors, totalBuyers, vendors, masterOrders, vendorOrders] = await Promise.all([
      User.countDocuments(),
      Vendor.countDocuments(),
      User.countDocuments({ role: 'buyer' }),
      Vendor.find(),
      MasterOrder.find(),
      VendorOrder.find()
    ]);

    const stats = vendorOrders.reduce(
      (acc, order) => {
        acc.totalPlatformFees += order.platformFee || 0;
        acc.totalVendorPayouts += order.vendorPayout || 0;
        if (order.escrowStatus === ESCROW_STATUS.FUNDS_HELD_IN_ESCROW) {
          acc.heldEscrow += order.vendorPayout || 0;
        }
        return acc;
      },
      { totalPlatformFees: 0, totalVendorPayouts: 0, heldEscrow: 0 }
    );

    return successResponse(res, {
      stats: {
        totalUsers,
        totalVendors,
        totalBuyers,
        totalMasterOrders: masterOrders.length,
        totalVendorOrders: vendorOrders.length,
        totalVolume: masterOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
        pendingKyc: vendors.filter((vendor) => vendor.kycStatus === 'pending').length,
        reviewRequiredOrders: masterOrders.filter((order) => order.paymentStatus === 'REVIEW_REQUIRED').length,
        ...stats
      }
    });
  })
);

// ---------------- Vendor Studio Management ----------------
router.get(
  '/vendors',
  asyncHandler(async (req, res) => {
    const vendors = await Vendor.find().populate('userId').sort({ createdAt: -1 });
    return successResponse(res, { vendors });
  })
);

router.patch(
  '/vendors/:id/kyc',
  asyncHandler(async (req, res) => {
    const { kycStatus, commissionRate } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(kycStatus)) {
      return errorResponse(res, 'Invalid kycStatus', 400);
    }

    const update = { kycStatus };
    if (commissionRate !== undefined) update.commissionRate = Number(commissionRate);

    const vendor = await Vendor.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!vendor) return errorResponse(res, 'Vendor not found', 404);
    return successResponse(res, { vendor });
  })
);

// ---------------- Order Review & Dispute Moderation ----------------
router.get(
  '/orders/review',
  asyncHandler(async (req, res) => {
    const orders = await MasterOrder.find({
      $or: [{ paymentStatus: 'REVIEW_REQUIRED' }, { escrowStatus: ESCROW_STATUS.DISPUTED }]
    }).populate('vendorOrderIds').sort({ updatedAt: -1 });
    return successResponse(res, { orders });
  })
);

router.post(
  '/orders/:masterOrderId/manual-review/approve',
  asyncHandler(async (req, res) => {
    try {
      const result = await OrderService.holdFundsForMasterOrder(req.params.masterOrderId, {
        receiptRef: req.body.receiptRef
      });
      return successResponse(res, result);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  })
);

router.post(
  '/orders/:masterOrderId/manual-review/reject',
  asyncHandler(async (req, res) => {
    try {
      const masterOrder = await MasterOrder.findById(req.params.masterOrderId);
      if (!masterOrder) {
        return errorResponse(res, 'Master order not found', 404);
      }
      masterOrder.paymentStatus = 'FAILED';
      masterOrder.reviewReason = req.body.reason || `Receipt rejected by admin ${req.user.displayName || req.user.email}`;
      await masterOrder.save();
      await OrderService.releaseReservationsForOrder(masterOrder._id);
      return successResponse(res, { masterOrder });
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  })
);

router.post(
  '/vendor-orders/:vendorOrderId/dispute',
  asyncHandler(async (req, res) => {
    try {
      const vendorOrder = await OrderService.transitionVendorOrder(req.params.vendorOrderId, ESCROW_STATUS.DISPUTED, req.user);
      return successResponse(res, { vendorOrder });
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  })
);

router.post(
  '/vendor-orders/:vendorOrderId/resolve-dispute',
  asyncHandler(async (req, res) => {
    try {
      const { action, reason } = req.body; // 'release', 'deliver', or 'refund'

      let vendorOrder;
      if (action === 'refund') {
        vendorOrder = await OrderService.refundVendorEscrow(
          req.params.vendorOrderId,
          reason || 'Dispute resolved in favor of buyer by admin',
          req.user
        );
      } else if (action === 'deliver') {
        vendorOrder = await OrderService.transitionVendorOrder(req.params.vendorOrderId, ESCROW_STATUS.DELIVERED, req.user);
      } else {
        vendorOrder = await OrderService.releaseVendorEscrow(req.params.vendorOrderId);
      }
      return successResponse(res, { vendorOrder });
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  })
);

router.post(
  '/escrow/release',
  asyncHandler(async (req, res) => {
    const { vendorOrderId } = req.body;
    if (!vendorOrderId) {
      return errorResponse(res, 'vendorOrderId is required', 400);
    }

    try {
      const vendorOrder = await OrderService.releaseVendorEscrow(vendorOrderId);
      return successResponse(res, { vendorOrder });
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  })
);

router.get(
  '/analytics/commissions',
  asyncHandler(async (req, res) => {
    const vendorOrders = await VendorOrder.find().populate('vendorId');
    const rows = vendorOrders.map((order) => ({
      vendorOrderId: order._id,
      vendorId: order.vendorId && order.vendorId._id,
      storeName: order.vendorId && order.vendorId.storeName,
      subtotal: order.subtotal,
      platformFee: order.platformFee,
      vendorPayout: order.vendorPayout,
      escrowStatus: order.escrowStatus
    }));
    return successResponse(res, { rows });
  })
);

// ---------------- Product Moderation & Global Catalog CRUD ----------------
router.get(
  '/products',
  asyncHandler(async (req, res) => {
    const products = await Product.find()
      .populate('vendorId', 'storeName kycStatus')
      .sort({ createdAt: -1 });
    return successResponse(res, { products });
  })
);

router.patch(
  '/products/:id/status',
  asyncHandler(async (req, res) => {
    const { isPublished } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isPublished: Boolean(isPublished) },
      { new: true }
    );
    if (!product) return errorResponse(res, 'Product not found', 404);
    return successResponse(res, { product });
  })
);

router.delete(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return errorResponse(res, 'Product not found', 404);
    return successResponse(res, {}, 200, 'Product permanently removed by admin');
  })
);

// ---------------- Customer CRM & User Management ----------------
router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const users = await User.find().select('-password').sort({ createdAt: -1 }).limit(100);
    const userStats = await Promise.all(
      users.map(async (u) => {
        const orderCount = await MasterOrder.countDocuments({ buyerId: u._id });
        return {
          id: u._id,
          _id: u._id,
          displayName: u.displayName || 'PALEO User',
          email: u.email,
          role: u.role,
          avatar: u.avatar,
          phone: u.phone,
          location: u.location,
          telegramUsername: u.telegramUsername,
          orderCount,
          createdAt: u.createdAt
        };
      })
    );
    return successResponse(res, { users: userStats });
  })
);

router.patch(
  '/users/:id/role',
  asyncHandler(async (req, res) => {
    const { role } = req.body;
    if (!['buyer', 'vendor', 'admin'].includes(role)) {
      return errorResponse(res, 'Invalid role', 400);
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return errorResponse(res, 'User not found', 404);
    return successResponse(res, { user });
  })
);

// ---------------- Database Backup & Snapshot Utility ----------------
router.post(
  '/backups/export',
  asyncHandler(async (req, res) => {
    const [users, vendors, products, masterOrders, vendorOrders, categories, coupons, reviews] = await Promise.all([
      User.find().select('-password'),
      Vendor.find(),
      Product.find(),
      MasterOrder.find(),
      VendorOrder.find(),
      Category.find(),
      Coupon.find(),
      Review.find()
    ]);

    const backupPayload = {
      timestamp: new Date().toISOString(),
      counts: {
        users: users.length,
        vendors: vendors.length,
        products: products.length,
        masterOrders: masterOrders.length,
        vendorOrders: vendorOrders.length,
        categories: categories.length,
        coupons: coupons.length,
        reviews: reviews.length
      },
      data: {
        users,
        vendors,
        products,
        masterOrders,
        vendorOrders,
        categories,
        coupons,
        reviews
      }
    };

    return successResponse(res, {
      message: 'Database snapshot generated successfully',
      backup: backupPayload
    });
  })
);

module.exports = router;
