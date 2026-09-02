import React from 'react';
import { BarChart3 } from 'lucide-react';

export function AnalyticsTab({ analytics, onReleaseEscrow }) {
  return (
    <section className="panel">
      <h2>
        <BarChart3 size={19} /> Commission Ledger & Escrow Release
      </h2>
      <div className="analytics">
        {analytics.map((row) => (
          <article className="item" key={row.vendorOrderId}>
            <div>
              <strong>{row.storeName || row.vendorId}</strong>
              <span>
                Subtotal: {row.subtotal} ETB · Platform Fee: {row.platformFee} ETB · Status: {row.escrowStatus}
              </span>
            </div>
            <button
              className="secondary"
              type="button"
              disabled={!['DELIVERED', 'DISPUTED'].includes(row.escrowStatus)}
              onClick={() => onReleaseEscrow(row.vendorOrderId)}
            >
              Disburse Payout
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
