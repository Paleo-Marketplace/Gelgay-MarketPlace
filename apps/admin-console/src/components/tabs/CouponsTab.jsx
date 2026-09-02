import React from 'react';

export function CouponsTab({
  coupons,
  newCoupon,
  onChangeNewCoupon,
  onCreateCoupon,
  onToggleCoupon,
  onDeleteCoupon
}) {
  return (
    <div className="columns">
      <section className="panel">
        <h2>Active Promo Codes ({coupons.length})</h2>
        <div className="list">
          {coupons.map((cp) => (
            <article className="item" key={cp._id}>
              <div>
                <strong style={{ color: '#E6A15C' }}>{cp.code}</strong>
                <span>
                  {cp.discountType === 'percentage' ? `${cp.discountValue}% OFF` : `${cp.discountValue} ETB OFF`} · Min
                  Order: {cp.minOrderAmount} ETB
                </span>
                <span>
                  Used: {cp.usedCount || 0} times · Active: {cp.isActive ? '✅ Yes' : '❌ No'}
                </span>
              </div>
              <div className="actions">
                <button className="secondary" type="button" onClick={() => onToggleCoupon(cp._id)}>
                  {cp.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button className="danger" type="button" onClick={() => onDeleteCoupon(cp._id)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Create New Promo Coupon</h2>
        <form onSubmit={onCreateCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="text"
            required
            placeholder="Coupon Code (e.g. ADDIS15)"
            value={newCoupon.code}
            onChange={(e) => onChangeNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
            style={{ padding: 8, background: '#1c1c1a', border: '1px solid #333', color: '#fff', borderRadius: 6 }}
          />
          <select
            value={newCoupon.discountType}
            onChange={(e) => onChangeNewCoupon({ ...newCoupon, discountType: e.target.value })}
            style={{ padding: 8, background: '#1c1c1a', border: '1px solid #333', color: '#fff', borderRadius: 6 }}
          >
            <option value="percentage">Percentage Discount (%)</option>
            <option value="fixed">Fixed ETB Discount (Flat Amount)</option>
          </select>
          <input
            type="number"
            required
            placeholder="Discount Value (e.g. 15 for 15% or 500 for ETB)"
            value={newCoupon.discountValue}
            onChange={(e) => onChangeNewCoupon({ ...newCoupon, discountValue: Number(e.target.value) })}
            style={{ padding: 8, background: '#1c1c1a', border: '1px solid #333', color: '#fff', borderRadius: 6 }}
          />
          <input
            type="number"
            placeholder="Min Order Amount (ETB)"
            value={newCoupon.minOrderAmount}
            onChange={(e) => onChangeNewCoupon({ ...newCoupon, minOrderAmount: Number(e.target.value) })}
            style={{ padding: 8, background: '#1c1c1a', border: '1px solid #333', color: '#fff', borderRadius: 6 }}
          />
          <button className="primary" type="submit">
            Deploy Promo Coupon
          </button>
        </form>
      </section>
    </div>
  );
}
