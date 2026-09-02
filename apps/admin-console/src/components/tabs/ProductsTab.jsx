import React from 'react';
import { Eye, EyeOff, Trash2 } from 'lucide-react';

export function ProductsTab({ products, onToggleStatus, onDeleteProduct }) {
  return (
    <section className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>Marketplace Products Catalog ({products.length})</h2>
      </div>
      <div className="list">
        {products.map((product) => (
          <article
            className="item"
            key={product._id}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {product.images?.[0] && (
                <img
                  src={product.images[0]}
                  alt={product.title}
                  style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }}
                />
              )}
              <div>
                <strong>{product.title}</strong>
                <span>{product.price} ETB · Stock: {product.stock} (Reserved: {product.reservedStock || 0})</span>
                <span>
                  Vendor: {product.vendorId?.storeName || 'PALEO Studio'} · Status:{' '}
                  {product.isPublished ? '🟢 Live' : '🔴 Delisted'}
                </span>
              </div>
            </div>
            <div className="actions">
              <button className="secondary" type="button" onClick={() => onToggleStatus(product._id, product.isPublished)}>
                {product.isPublished ? (
                  <>
                    <EyeOff size={14} /> Delist
                  </>
                ) : (
                  <>
                    <Eye size={14} /> Publish
                  </>
                )}
              </button>
              <button className="danger" type="button" onClick={() => onDeleteProduct(product._id)}>
                <Trash2 size={14} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
