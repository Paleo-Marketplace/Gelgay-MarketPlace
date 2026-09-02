import React from 'react';
import { BadgeCheck, Banknote, FileWarning, Users } from 'lucide-react';

export function MetricCards({ stats }) {
  const cards = [
    {
      label: 'Registered Users',
      value: stats?.totalUsers || 0,
      suffix: '',
      Icon: Users,
      iconBg: '#eff6ff',
      iconColor: '#3b82f6',
      subtext: 'Verified Buyers & Studio Merchants'
    },
    {
      label: 'Vendor Studios',
      value: stats?.totalVendors || 0,
      suffix: '',
      Icon: BadgeCheck,
      iconBg: '#ecfdf5',
      iconColor: '#10b981',
      subtext: 'Active Curators across Addis Ababa'
    },
    {
      label: 'Escrow Disputes',
      value: stats?.reviewRequiredOrders || 0,
      suffix: '',
      Icon: FileWarning,
      iconBg: (stats?.reviewRequiredOrders || 0) > 0 ? '#fef2f2' : '#f8fafc',
      iconColor: (stats?.reviewRequiredOrders || 0) > 0 ? '#ef4444' : '#64748b',
      subtext: 'Flagged orders awaiting arbitration'
    },
    {
      label: 'Platform Revenue',
      value: Math.round(stats?.totalPlatformFees || 0).toLocaleString(),
      suffix: ' ETB',
      Icon: Banknote,
      iconBg: '#fff7ed',
      iconColor: '#d96b43',
      subtext: '2.5% Automated Marketplace Take Rate'
    }
  ];

  return (
    <section className="metrics-grid" aria-label="Platform System Metrics">
      {cards.map(({ label, value, suffix, Icon, iconBg, iconColor, subtext }) => (
        <div className="metric-card" key={label}>
          <div className="metric-card-header">
            <div className="metric-icon-box" style={{ background: iconBg, color: iconColor }}>
              <Icon size={20} />
            </div>
            <span className="metric-label">{label}</span>
          </div>

          <div className="metric-value-wrap">
            <span className="metric-value">{value}</span>
            {suffix && <span className="metric-suffix">{suffix}</span>}
          </div>

          <div className="metric-subtext">{subtext}</div>
        </div>
      ))}
    </section>
  );
}
