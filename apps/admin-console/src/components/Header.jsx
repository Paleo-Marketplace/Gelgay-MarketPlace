import React from 'react';
import { Download, LogOut, RefreshCw, ShoppingBag, Store, Truck, ShieldCheck, Sun, Moon } from 'lucide-react';

export function Header({ onExportBackup, onRefresh, onLogout, isDarkMode, onToggleTheme }) {
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefreshClick = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  return (
    <header className="top">
      {/* Left: Brand Identity & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: '#EB5B00',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(235, 91, 0, 0.25)',
          flexShrink: 0
        }}>
          <img src={`${import.meta.env.BASE_URL}gelgay_icon.png`} alt="ገልጋይ" style={{ width: '26px', height: '26px', objectFit: 'contain' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--forest-900)' }}>
            ገልጋይ Admin Operations
          </h1>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: '12px',
            background: isDarkMode ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7',
            color: isDarkMode ? '#86efac' : '#15803d',
            fontSize: '11px',
            fontWeight: 700,
            fontFamily: 'var(--font-sans)'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
            Live Escrow
          </span>
        </div>
      </div>

      {/* Right: Portal Switcher & Action Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <nav className="portal-nav-group" aria-label="Portal Navigation">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="portal-nav-link"
            title="Open Buyer Storefront"
          >
            <ShoppingBag size={14} color="#62726a" />
            <span>Storefront</span>
          </a>

          <a
            href="/vendor/"
            target="_blank"
            rel="noreferrer"
            className="portal-nav-link"
            title="Open Vendor Studio Dashboard"
          >
            <Store size={14} color="#62726a" />
            <span>Vendor Studio</span>
          </a>

          <a
            href="/courier/"
            target="_blank"
            rel="noreferrer"
            className="portal-nav-link"
            title="Open Courier Dispatch View"
          >
            <Truck size={14} color="#62726a" />
            <span>Courier</span>
          </a>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="secondary"
            onClick={onToggleTheme}
            style={{
              minHeight: '36px',
              padding: '0 12px',
              fontSize: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun size={14} color="#f59e0b" /> : <Moon size={14} color="#62726a" />}
            <span>{isDarkMode ? 'Light' : 'Dark'}</span>
          </button>

          <button
            className="secondary"
            type="button"
            onClick={handleRefreshClick}
            disabled={refreshing}
            style={{ minHeight: '36px', padding: '0 12px', fontSize: '12px' }}
            title="Reload live metrics and orders"
          >
            <RefreshCw size={13} className={refreshing ? 'spin-icon' : ''} />
            <span>Refresh</span>
          </button>

          <button
            className="primary"
            type="button"
            onClick={onExportBackup}
            style={{ minHeight: '36px', padding: '0 12px', fontSize: '12px' }}
            title="Export JSON snapshot"
          >
            <Download size={13} />
            <span>Backup</span>
          </button>

          <button
            className="secondary"
            type="button"
            onClick={onLogout}
            style={{
              minHeight: '36px',
              padding: '0 12px',
              fontSize: '12px',
              borderColor: 'rgba(239, 68, 68, 0.25)',
              color: '#dc2626',
              background: isDarkMode ? 'rgba(239, 68, 68, 0.12)' : '#fff5f5'
            }}
            title="Sign out of admin console"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
