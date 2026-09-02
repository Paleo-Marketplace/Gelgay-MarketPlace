class CommissionService {
  static platformFeeFor(subtotal, vendor) {
    const defaultRate = Number(process.env.DEFAULT_PLATFORM_FEE_RATE || process.env.MARKETPLACE_COMMISSION_RATE || 0.025);
    const rate = Number(vendor && vendor.commissionRate !== undefined ? vendor.commissionRate : defaultRate);
    const normalizedRate = Number.isFinite(rate) && rate >= 0 ? rate : 0.025;
    const platformFee = Number((subtotal * normalizedRate).toFixed(2));

    return {
      rate: normalizedRate,
      platformFee,
      vendorPayout: Number((subtotal - platformFee).toFixed(2))
    };
  }
}

module.exports = CommissionService;
