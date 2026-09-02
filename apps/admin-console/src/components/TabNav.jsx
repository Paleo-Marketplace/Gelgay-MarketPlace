import React from 'react';
import { BadgeCheck, Package, Layers, Tag, Users, Scale, BarChart3 } from 'lucide-react';

const TABS = [
  ['overview', 'Overview & KYC', BadgeCheck],
  ['products', 'Catalog & Products', Package],
  ['categories', 'Categories', Layers],
  ['coupons', 'Promo Coupons', Tag],
  ['users', 'Customers & CRM', Users],
  ['disputes', 'Disputes & Review', Scale],
  ['analytics', 'Commissions & Escrow', BarChart3]
];

export function TabNav({ activeTab, onSelectTab }) {
  return (
    <nav className="tabs" style={{ display: 'flex', gap: '6px', margin: '20px 0', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
      {TABS.map(([key, label, Icon]) => (
        <button
          key={key}
          type="button"
          className={activeTab === key ? 'primary' : 'secondary'}
          onClick={() => onSelectTab(key)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Icon size={15} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
