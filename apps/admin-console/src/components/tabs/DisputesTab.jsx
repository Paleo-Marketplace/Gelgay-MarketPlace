import React from 'react';
import { Scale } from 'lucide-react';

export function DisputesTab({ reviewOrders, onApproveReview, onRejectReview }) {
  return (
    <section className="panel">
      <h2>
        <Scale size={19} /> Disputes & Manual Receipt Approvals
      </h2>
      <div className="list">
        {reviewOrders.length === 0 ? (
          <p style={{ color: '#888' }}>No pending receipt reviews or disputed orders.</p>
        ) : (
          reviewOrders.map((order) => (
            <article className="item" key={order._id}>
              <div>
                <strong>Order #{order._id}</strong>
                <span>
                  Amount: {order.totalAmount} ETB · Payment: {order.paymentStatus} · Escrow: {order.escrowStatus}
                </span>
                {order.receiptRef && (
                  <span>
                    Receipt Ref: <code>{order.receiptRef}</code>
                  </span>
                )}
                {order.reviewReason ? <span style={{ color: '#E6A15C' }}>Reason: {order.reviewReason}</span> : null}
              </div>
              <div className="actions">
                {order.paymentStatus === 'REVIEW_REQUIRED' && (
                  <>
                    <button className="secondary" type="button" onClick={() => onApproveReview(order._id, order.receiptRef)}>
                      Approve Payment
                    </button>
                    <button className="danger" type="button" onClick={() => onRejectReview(order._id)}>
                      Reject Payment
                    </button>
                  </>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
