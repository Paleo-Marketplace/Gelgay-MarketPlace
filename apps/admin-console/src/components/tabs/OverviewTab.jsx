import React from 'react';

export function OverviewTab({ vendors, onSetKyc }) {
  return (
    <section className="panel">
      <h2>Vendor Studio KYC Verifications</h2>
      <div className="list">
        {vendors.map((vendor) => (
          <article className="item" key={vendor._id}>
            <div>
              <strong>{vendor.storeName}</strong>
              <span>
                {vendor.userId?.displayName || vendor.userId?.email} · Status:{' '}
                <b style={{ color: vendor.kycStatus === 'approved' ? '#68D391' : '#F6AD55' }}>
                  {vendor.kycStatus}
                </b>
              </span>
              <span>Payout Bank: {vendor.payoutDetails?.bank || 'CBE'} - {vendor.payoutDetails?.account || 'N/A'}</span>
            </div>
            <div className="actions">
              <button className="secondary" type="button" onClick={() => onSetKyc(vendor._id, 'approved')}>
                Approve
              </button>
              <button className="danger" type="button" onClick={() => onSetKyc(vendor._id, 'rejected')}>
                Reject
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
