const mongoose = require('mongoose');
const Vendor = require('../models/Vendor');

const hasExplicitVendorId = (value) => {
  if (!value || typeof value !== 'object') return false;
  return Object.prototype.hasOwnProperty.call(value, 'vendorId');
};

const rejectClientVendorId = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    if (hasExplicitVendorId(req.body) || hasExplicitVendorId(req.query) || hasExplicitVendorId(req.params)) {
      return res.status(400).json({
        success: false,
        message: 'vendorId is derived from the HttpOnly JWT and must not be supplied by the client'
      });
    }
  }

  return next();
};

const enforceVendorIsolation = (req, res, next) => {
  if (!req.user || (req.user.role !== 'vendor' && req.user.role !== 'admin') || !req.user.vendorId) {
    if (res && res.status) {
      return res.status(403).json({
        success: false,
        message: 'Authenticated vendor account with vendorId is required'
      });
    }
    return;
  }

  req.vendorId = req.user.vendorId;
  return next();
};

const requireApprovedVendor = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const role = (req.user.role || '').toLowerCase();
  if (role !== 'vendor' && role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access restricted to approved vendors. Please complete vendor onboarding.',
      redirect: '/vendor/onboarding'
    });
  }

  if (role === 'admin') {
    if (!req.vendorId && req.user.vendorId) req.vendorId = req.user.vendorId;
    return next();
  }

  const vendorId = req.user.vendorId;
  let vendor = null;
  if (vendorId && mongoose.isValidObjectId(vendorId)) {
    vendor = await Vendor.findById(vendorId);
  }
  if (!vendor) {
    const userId = req.user.id || req.user._id;
    if (userId && mongoose.isValidObjectId(userId)) {
      vendor = await Vendor.findOne({ userId });
    }
  }

  if (!vendor) {
    return res.status(403).json({
      success: false,
      message: 'Vendor profile not found. Please complete seller onboarding first.',
      redirect: '/vendor/onboarding',
      error: 'KYC_PENDING'
    });
  }

  if (vendor.kycStatus !== 'approved') {
    return res.status(403).json({
      success: false,
      message: `Vendor KYC verification status is '${vendor.kycStatus}'. Full approval is required.`,
      kycStatus: vendor.kycStatus,
      redirect: '/vendor/onboarding',
      error: 'KYC_PENDING'
    });
  }

  req.vendor = vendor;
  req.vendorId = vendor._id.toString();
  return next();
};

module.exports = {
  rejectClientVendorId,
  enforceVendorIsolation,
  requireApprovedVendor,
  requireVendor: requireApprovedVendor
};
