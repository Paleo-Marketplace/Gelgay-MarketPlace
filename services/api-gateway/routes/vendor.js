const express = require('express');
const Product = require('../models/Product');
const VendorOrder = require('../models/VendorOrder');
const Vendor = require('../models/Vendor');
const OrderService = require('../services/OrderService');
const { authenticateJWT } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { enforceVendorIsolation, rejectClientVendorId, requireApprovedVendor } = require('../middleware/vendorIsolation');
const { ESCROW_STATUS } = require('../constants/orderStates');
const User = require('../models/User');

const router = express.Router();

// ---------------- 1. Apply to Become a Seller (Open to any authenticated user) ----------------
router.post('/apply', authenticateJWT, async (req, res) => {
  try {
    const {
      storeName,
      storeBio,
      sellerType = 'individual',
      legalName,
      taxId,
      nationalIdNumber,
      idDocumentUrl,
      businessLicenseUrl,
      bank = 'Commercial Bank of Ethiopia (CBE)',
      account,
      accountHolder,
      address = 'Addis Ababa, Ethiopia',
      agreedToTerms = false
    } = req.body;

    if (!storeName || !account || !agreedToTerms) {
      return res.status(400).json({
        success: false,
        message: 'Store name, payout account number, and agreement to seller terms are required'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let vendor = await Vendor.findOne({ userId: user._id });
    if (vendor) {
      vendor.storeName = storeName.trim();
      vendor.storeBio = storeBio?.trim() || vendor.storeBio;
      vendor.sellerType = sellerType;
      vendor.legalName = legalName?.trim() || vendor.legalName;
      vendor.taxId = taxId?.trim() || vendor.taxId;
      vendor.nationalIdNumber = nationalIdNumber?.trim() || vendor.nationalIdNumber;
      vendor.idDocumentUrl = idDocumentUrl || vendor.idDocumentUrl;
      vendor.businessLicenseUrl = businessLicenseUrl || vendor.businessLicenseUrl;
      vendor.payoutDetails = {
        bank,
        account: account.trim(),
        accountHolder: accountHolder?.trim() || user.displayName
      };
      vendor.address = address.trim();
      vendor.agreedToTerms = Boolean(agreedToTerms);
      vendor.agreedToTermsAt = new Date();
      vendor.kycStatus = 'approved';
      await vendor.save();
    } else {
      vendor = await Vendor.create({
        userId: user._id,
        storeName: storeName.trim(),
        storeBio: storeBio?.trim() || '',
        sellerType,
        legalName: legalName?.trim() || user.displayName,
        taxId: taxId?.trim(),
        nationalIdNumber: nationalIdNumber?.trim(),
        idDocumentUrl,
        businessLicenseUrl,
        payoutDetails: {
          bank,
          account: account.trim(),
          accountHolder: accountHolder?.trim() || user.displayName
        },
        address: address.trim(),
        agreedToTerms: Boolean(agreedToTerms),
        agreedToTermsAt: new Date(),
        kycStatus: 'approved'
      });
    }

    // Upgrade user role to vendor and complete profile
    user.role = 'vendor';
    user.isProfileComplete = true;
    if (address) user.location = address;
    await user.save();

    return res.status(201).json({
      success: true,
      message: 'Seller application approved! Your store is now active.',
      vendor,
      user: {
        id: user._id.toString(),
        _id: user._id.toString(),
        role: user.role,
        email: user.email,
        displayName: user.displayName,
        vendorId: vendor._id.toString()
      }
    });
  } catch (error) {
    console.error('[Seller Application Error]:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ---------------- Vendor-Restricted Routes (Requires Approved KYC) ----------------
router.use(authenticateJWT, enforceVendorIsolation, requireApprovedVendor);

router.get('/profile', async (req, res) => {
  const vendor = await Vendor.findById(req.vendorId);
  return res.json({ success: true, vendor });
});

router.get('/products', async (req, res) => {
  const products = await Product.find({ vendorId: req.vendorId }).sort({ createdAt: -1 });
  return res.json({ success: true, products });
});

router.post('/products', rejectClientVendorId, async (req, res) => {
  try {
    const product = await Product.create({
      vendorId: req.vendorId,
      title: req.body.title,
      description: req.body.description,
      price: Number(req.body.price),
      stock: Number(req.body.stock),
      category: req.body.category,
      images: req.body.images || [],
      location: req.body.location
    });
    return res.status(201).json({ success: true, product });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

router.patch('/products/:id', rejectClientVendorId, async (req, res) => {
  const allowed = ['title', 'description', 'price', 'stock', 'category', 'images', 'location', 'isPublished'];
  const update = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }

  const existing = await Product.findOne({ _id: req.params.id, vendorId: req.vendorId });
  if (!existing) return res.status(404).json({ success: false, message: 'Product not found' });

  if (req.body.stock !== undefined) {
    const newStock = Number(req.body.stock);
    if (!Number.isFinite(newStock) || newStock < 0) {
      return res.status(400).json({ success: false, message: 'Stock must be a non-negative number' });
    }
    const reserved = existing.reservedStock || 0;
    if (newStock < reserved) {
      return res.status(400).json({
        success: false,
        message: `Cannot set stock below currently reserved stock (${reserved})`
      });
    }
  }

  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, vendorId: req.vendorId },
    update,
    { new: true, runValidators: true }
  );
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  return res.json({ success: true, product });
});

router.delete('/products/:id', rejectClientVendorId, async (req, res) => {
  const result = await Product.findOneAndUpdate(
    { _id: req.params.id, vendorId: req.vendorId },
    { isPublished: false, isArchived: true },
    { new: true }
  );
  if (!result) return res.status(404).json({ success: false, message: 'Product not found' });
  return res.json({ success: true, message: 'Product archived successfully' });
});

router.get('/orders', async (req, res) => {
  const query = { vendorId: req.vendorId };
  if (req.query.escrowStatus) query.escrowStatus = req.query.escrowStatus;
  if (req.query.fulfillmentStatus) query.fulfillmentStatus = req.query.fulfillmentStatus;
  const vendorOrders = await VendorOrder.find(query).populate('masterOrderId').sort({ createdAt: -1 });
  return res.json({ success: true, vendorOrders });
});

router.patch('/orders/:id/dispatch', async (req, res) => {
  try {
    const vendorOrder = await OrderService.transitionVendorOrder(req.params.id, ESCROW_STATUS.DISPATCHED, req.user);
    return res.json({ success: true, vendorOrder });
  } catch (error) {
    return res.status(error.status || 400).json({ success: false, message: error.message });
  }
});

router.post('/payout-requests', async (req, res) => {
  const vendor = await Vendor.findById(req.vendorId);
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > vendor.vendorPayoutBalance.available) {
    return res.status(400).json({ success: false, message: 'Invalid payout request amount' });
  }

  vendor.vendorPayoutBalance.available -= amount;
  vendor.vendorPayoutBalance.requested += amount;
  await vendor.save();

  return res.status(201).json({ success: true, vendorPayoutBalance: vendor.vendorPayoutBalance });
});

router.get('/metrics', async (req, res) => {
  const [vendor, productsCount, orders] = await Promise.all([
    Vendor.findById(req.vendorId),
    Product.countDocuments({ vendorId: req.vendorId }),
    VendorOrder.find({ vendorId: req.vendorId })
  ]);

  const metrics = orders.reduce(
    (acc, order) => {
      acc.grossSales += order.subtotal;
      acc.platformFees += order.platformFee;
      acc.vendorPayout += order.vendorPayout;
      if (order.escrowStatus === ESCROW_STATUS.FUNDS_HELD_IN_ESCROW) acc.heldEscrow += order.vendorPayout;
      if (order.escrowStatus === ESCROW_STATUS.FUNDS_RELEASED) acc.releasedEscrow += order.vendorPayout;
      return acc;
    },
    { productsCount, totalOrders: orders.length, grossSales: 0, platformFees: 0, vendorPayout: 0, heldEscrow: 0, releasedEscrow: 0 }
  );

  return res.json({ success: true, vendor, metrics });
});

module.exports = router;
