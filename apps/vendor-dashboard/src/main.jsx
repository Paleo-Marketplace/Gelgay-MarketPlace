import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Box,
  CheckCircle2,
  ImagePlus,
  PackageOpen,
  Truck,
  WalletCards,
  LogOut,
  ArrowLeft,
  DollarSign,
  Receipt,
  Building,
  Layers,
  Sparkles,
  Store,
  Lock,
  ExternalLink,
  ShoppingBag,
  ShieldCheck,
  Sun,
  Moon
} from 'lucide-react';
import './styles.css';
import { api } from './api/client';

function App() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [status, setStatus] = useState('');
  const [profile, setProfile] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [imageFiles, setImageFiles] = useState({});
  const [payoutAmount, setPayoutAmount] = useState('');
  const [bankDetails, setBankDetails] = useState({
    bank: 'Commercial Bank of Ethiopia (CBE)',
    account: '',
    accountHolder: ''
  });

  // Theme synchronization across all tabs and portals
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('paleo_theme');
    if (stored) return stored === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    const themeStr = next ? 'dark' : 'light';
    localStorage.setItem('paleo_theme', themeStr);
    document.documentElement.setAttribute('data-theme', themeStr);
    document.documentElement.classList.toggle('dark', next);
  };

  useEffect(() => {
    const themeStr = isDarkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', themeStr);
    document.documentElement.classList.toggle('dark', isDarkMode);

    const handleStorage = (e) => {
      if (e.key === 'paleo_theme' && e.newValue) {
        const isDark = e.newValue === 'dark';
        setIsDarkMode(isDark);
        document.documentElement.setAttribute('data-theme', e.newValue);
        document.documentElement.classList.toggle('dark', isDark);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [isDarkMode]);

  // Login form state - clean unexposed initialization
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    stock: '',
    category: 'Everyday Carry'
  });

  const load = useCallback(async () => {
    try {
      const [profileData, productData, orderData, metricsData] = await Promise.all([
        api('/api/vendor/profile').catch(() => ({})),
        api('/api/vendor/products').catch(() => ({})),
        api('/api/vendor/orders').catch(() => ({})),
        api('/api/vendor/metrics').catch(() => ({}))
      ]);

      if (profileData.vendor) {
        setProfile(profileData.vendor);
        if (profileData.vendor.payoutDetails) {
          setBankDetails({
            bank: profileData.vendor.payoutDetails.bank || 'Commercial Bank of Ethiopia (CBE)',
            account: profileData.vendor.payoutDetails.account || '',
            accountHolder: profileData.vendor.payoutDetails.accountHolder || ''
          });
        }
        setProducts(productData.products || []);
        setOrders(orderData.vendorOrders || []);
        setMetrics(metricsData.metrics || null);
        return true;
      } else {
        setProfile(null);
        return false;
      }
    } catch (err) {
      console.warn('Failed to load vendor data:', err);
      setProfile(null);
      return false;
    } finally {
      setAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const handleVendorLogin = async (e) => {
    if (e) e.preventDefault();
    setLoginBusy(true);
    setLoginError('');

    try {
      const res = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword
        })
      });

      if (res.success && res.user) {
        if (res.user.role !== 'vendor' && res.user.role !== 'admin') {
          throw new Error(`Account role is '${res.user.role}'. Please sign in with a vendor studio account.`);
        }
        setStatus('Signed in to Vendor Studio.');
        await load();
      } else {
        throw new Error(res.message || 'Login failed.');
      }
    } catch (err) {
      setLoginError(err.message || 'Invalid vendor credentials');
    } finally {
      setLoginBusy(false);
    }
  };

  const createProduct = async (event) => {
    event.preventDefault();
    try {
      await api('/api/vendor/products', { method: 'POST', body: JSON.stringify(form) });
      setForm({ title: '', description: '', price: '', stock: '', category: 'Everyday Carry' });
      await load();
      setStatus('Product listed successfully.');
    } catch (error) {
      setStatus(error.message);
    }
  };

  const updateStock = async (product, stock) => {
    try {
      await api(`/api/vendor/products/${product._id}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({ stock: Number(stock) })
      });
      await load();
      setStatus(`Stock updated for ${product.title}.`);
    } catch (error) {
      setStatus(error.message);
    }
  };

  const uploadImage = async (productId) => {
    const file = imageFiles[productId];
    if (!file) return setStatus('Select an image file first.');
    const formData = new FormData();
    formData.append('image', file);

    try {
      await api(`/api/vendor/products/${productId}/image`, {
        method: 'POST',
        body: formData
      });
      setImageFiles({ ...imageFiles, [productId]: null });
      await load();
      setStatus('Product image uploaded successfully.');
    } catch (error) {
      setStatus(error.message);
    }
  };

  const dispatchOrder = async (vendorOrderId) => {
    try {
      await api(`/api/vendor/orders/${vendorOrderId}/dispatch`, { method: 'POST' });
      await load();
      setStatus('Order marked as DISPATCHED to courier.');
    } catch (error) {
      setStatus(error.message);
    }
  };

  const saveBankDetails = async (event) => {
    event.preventDefault();
    try {
      await api('/api/vendor/payout-details', {
        method: 'PATCH',
        body: JSON.stringify(bankDetails)
      });
      await load();
      setStatus('CBE Bank disbursement details saved.');
    } catch (error) {
      setStatus(error.message);
    }
  };

  const requestPayout = async (event) => {
    event.preventDefault();
    try {
      await api('/api/vendor/request-payout', {
        method: 'POST',
        body: JSON.stringify({ amount: Number(payoutAmount) })
      });
      setPayoutAmount('');
      await load();
      setStatus('Payout request queued for processing.');
    } catch (error) {
      setStatus(error.message);
    }
  };

  const logoutUser = async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error(error);
    } finally {
      window.location.href = '/';
    }
  };

  // Loading screen
  if (authChecking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF8F5', fontFamily: 'sans-serif', color: '#625D54' }}>
        <div style={{ textAlign: 'center' }}>
          <img src={`${import.meta.env.BASE_URL}gelgay_logo_lockup.png`} alt="ገልጋይ" style={{ height: '48px', width: 'auto', marginBottom: '12px', display: 'inline-block' }} />
          <div>Loading Vendor Studio Operations...</div>
        </div>
      </div>
    );
  }

  // Vendor Studio Sign-In Screen if not authenticated
  if (!profile) {
    return (
      <main style={{ minHeight: '100vh', background: '#1F1E1B', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'var(--font-sans)' }}>
        <div style={{ maxWidth: '480px', width: '100%', background: '#2B2824', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '24px', padding: '36px', color: '#FAF8F5', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
            <img src={`${import.meta.env.BASE_URL}gelgay_icon.png`} alt="ገልጋይ" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
            <div>
              <div style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '1.5px', color: '#EB5B00', textTransform: 'uppercase' }}>
                ገልጋይ (GELGAY) · Merchant Portal
              </div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontFamily: 'var(--font-serif)', color: '#ffffff' }}>
                Vendor Studio Dashboard
              </h2>
            </div>
          </div>

          <p style={{ fontSize: '13px', color: '#A5A096', marginBottom: '20px', lineHeight: 1.5 }}>
            Sign in with your verified merchant credentials to manage your product catalog, dispatch physical courier handoffs, and withdraw escrow payouts.
          </p>

          {loginError && (
            <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', color: '#fca5a5', fontSize: '12px', marginBottom: '18px', fontFamily: 'monospace' }}>
              ⚠️ {loginError}
            </div>
          )}

          <form onSubmit={handleVendorLogin} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#A5A096', marginBottom: '6px', textTransform: 'uppercase' }}>
                Vendor Email
              </label>
              <input
                type="email"
                required
                autoComplete="username"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', background: '#1F1E1B', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#ffffff', fontSize: '14px', outline: 'none' }}
                placeholder="merchant@example.com"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#A5A096', marginBottom: '6px', textTransform: 'uppercase' }}>
                Password
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', background: '#1F1E1B', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#ffffff', fontSize: '14px', outline: 'none' }}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loginBusy}
              style={{ marginTop: '8px', padding: '13px', background: '#C85A32', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(200, 90, 50, 0.35)' }}
            >
              <Lock size={15} />
              <span>{loginBusy ? 'Authenticating...' : 'Sign In to Vendor Studio'}</span>
            </button>
          </form>

          {/* Portal Switcher Navigation */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#A5A096' }}>
            <a
              href="/"
              style={{ color: '#A5A096', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <ShoppingBag size={12} />
              <span>Buyer Storefront</span>
            </a>

            <a
              href="/admin/"
              style={{ color: '#d96b43', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
            >
              <span>Admin Console</span>
              <ExternalLink size={12} />
            </a>
          </div>

        </div>
      </main>
    );
  }

  // Vendor KYC Approval Gate: Lock management views until KYC is approved by Admin
  if (profile.kycStatus && profile.kycStatus !== 'approved') {
    return (
      <main style={{ minHeight: '100vh', background: '#1F1E1B', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'var(--font-sans)' }}>
        <div style={{ maxWidth: '520px', width: '100%', background: '#2B2824', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '24px', padding: '36px', color: '#FAF8F5', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
            <img src={`${import.meta.env.BASE_URL}gelgay_icon.png`} alt="ገልጋይ" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
            <div>
              <div style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '1.5px', color: '#EB5B00', textTransform: 'uppercase' }}>
                Merchant Onboarding Gate
              </div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontFamily: 'var(--font-serif)', color: '#ffffff' }}>
                {profile.kycStatus === 'pending' ? 'KYC Verification Pending' : 'KYC Approval Required'}
              </h2>
            </div>
          </div>

          <p style={{ fontSize: '13px', color: '#A5A096', marginBottom: '20px', lineHeight: 1.5 }}>
            {profile.kycStatus === 'pending'
              ? `Your seller application for "${profile.storeName}" is currently under review by our operations team. Live inventory creation and escrow payouts will unlock once verified.`
              : `Your seller status is currently "${profile.kycStatus}". Please complete verification before accessing vendor management tools.`}
          </p>

          <div style={{ padding: '16px', background: 'rgba(235, 91, 0, 0.1)', border: '1px solid rgba(235, 91, 0, 0.3)', borderRadius: '14px', marginBottom: '24px', fontSize: '12px', color: '#f59e0b' }}>
            <div style={{ fontWeight: 700, marginBottom: '4px' }}>🔒 Verified Merchant Credentials</div>
            <div>Store: <strong>{profile.storeName || 'My Studio'}</strong> · Payout: <strong>{profile.payoutDetails?.bank || 'CBE'} ({profile.payoutDetails?.account || 'N/A'})</strong></div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <a
              href="/"
              style={{ flex: 1, padding: '12px', background: '#1F1E1B', border: '1px solid rgba(255,255,255,0.15)', color: '#FAF8F5', borderRadius: '12px', fontSize: '13px', fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}
            >
              Buyer Storefront
            </a>
            <button
              type="button"
              onClick={logoutUser}
              style={{ flex: 1, padding: '12px', background: '#C85A32', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Financial summary metrics
  const totalSales = metrics?.grossSales || 0;
  const platformFees = metrics?.platformFees || 0;
  const netEarnings = metrics?.vendorPayout || 0;
  const heldInEscrow = metrics?.heldEscrow || 0;
  const availablePayout = profile?.vendorPayoutBalance?.available || 0;
  const estimatedVatTax = Math.round(totalSales * 0.15);

  return (
    <main className="app-shell">
      <header className="bar">
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
              ገልጋይ Vendor Studio
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '12px',
              background: '#fef3c7',
              color: '#92400e',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: 'var(--font-sans)'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706' }} />
              Verified Studio
            </span>
          </div>
        </div>

        {/* Right: Portals & Studio Profile */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
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
              href="/admin/"
              target="_blank"
              rel="noreferrer"
              className="portal-nav-link"
              title="Open Admin Console"
            >
              <ShieldCheck size={14} color="#62726a" />
              <span>Admin</span>
            </a>
            <a
              href="/courier/"
              target="_blank"
              rel="noreferrer"
              className="portal-nav-link"
              title="Open Courier View"
            >
              <Truck size={14} color="#62726a" />
              <span>Courier</span>
            </a>
          </nav>

          <button
            type="button"
            className="secondary"
            onClick={toggleTheme}
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

          <span style={{
            fontSize: '12px',
            color: 'var(--forest-900)',
            fontWeight: 600,
            background: 'var(--bg-surface)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-medium)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <span>🏪</span>
            <span>{profile.storeName}</span>
          </span>

          <button
            className="secondary"
            onClick={logoutUser}
            type="button"
            style={{
              minHeight: '36px',
              padding: '0 12px',
              fontSize: '12px',
              borderColor: 'rgba(239, 68, 68, 0.25)',
              color: '#dc2626',
              background: isDarkMode ? 'rgba(239, 68, 68, 0.12)' : '#fff5f5'
            }}
            title="Sign out of vendor studio"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {status ? <div className="notice">{status}</div> : null}

      {/* Top Level Financials & Metric Cards */}
      <section className="metrics">
        <div>
          <DollarSign size={20} color="#d96b43" />
          <div>
            <strong>{Math.round(totalSales).toLocaleString()} ETB</strong>
            <span>Gross Sales Volume</span>
          </div>
        </div>
        <div>
          <CheckCircle2 size={20} color="#183329" />
          <div>
            <strong>{Math.round(availablePayout).toLocaleString()} ETB</strong>
            <span>Available for Withdrawal</span>
          </div>
        </div>
        <div>
          <WalletCards size={20} color="#c98539" />
          <div>
            <strong>{Math.round(heldInEscrow).toLocaleString()} ETB</strong>
            <span>Locked in Escrow</span>
          </div>
        </div>
        <div>
          <Receipt size={20} color="#62726a" />
          <div>
            <strong>{Math.round(estimatedVatTax).toLocaleString()} ETB</strong>
            <span>15% VAT Tax Collected</span>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <nav style={{ display: 'flex', gap: '8px', margin: '20px 0', borderBottom: '1px solid var(--border-medium)', paddingBottom: '12px' }}>
        <button
          className={activeTab === 'inventory' ? 'primary' : 'secondary'}
          type="button"
          onClick={() => setActiveTab('inventory')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Box size={16} /> Products & Inventory ({products.length})
        </button>
        <button
          className={activeTab === 'fulfillment' ? 'primary' : 'secondary'}
          type="button"
          onClick={() => setActiveTab('fulfillment')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Truck size={16} /> Fulfillment & Orders ({orders.length})
        </button>
        <button
          className={activeTab === 'financials' ? 'primary' : 'secondary'}
          type="button"
          onClick={() => setActiveTab('financials')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Receipt size={16} /> Revenue, Fees & Tax Ledger
        </button>
        <button
          className={activeTab === 'payouts' ? 'primary' : 'secondary'}
          type="button"
          onClick={() => setActiveTab('payouts')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Building size={16} /> Bank Payouts & Disbursals
        </button>
      </nav>

      {/* TAB 1: INVENTORY MANAGEMENT */}
      {activeTab === 'inventory' && (
        <div className="grid">
          <section className="panel">
            <h2>Add Archival Object to Studio</h2>
            <form onSubmit={createProduct} style={{ marginTop: '16px' }}>
              <label>Object Title</label>
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Braun ET66 Calculator" required />

              <label>Category</label>
              <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                <option value="Everyday Carry">Everyday Carry (Pocket & Audio)</option>
                <option value="Home Archive">Home Archive (Furniture & Teak)</option>
                <option value="Creative Tools">Creative Tools (Cameras & Studio)</option>
                <option value="Archival Wear">Archival Wear (Highland Leather & Denim)</option>
                <option value="Paper Archive">Paper Archive (Rare Books & Monographs)</option>
              </select>

              <label>Provenance & Description</label>
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Condition, designer, year of production, dimensions..." />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label>Price (ETB)</label>
                  <input type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="4500" required />
                </div>
                <div>
                  <label>Available Quantity</label>
                  <input type="number" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} placeholder="1" required />
                </div>
              </div>

              <button className="primary" style={{ marginTop: '16px' }} type="submit">
                <Box size={16} /> List in Studio Storefront
              </button>
            </form>

            <h2 style={{ marginTop: '32px' }}>Active Studio Inventory ({products.length})</h2>
            <div className="table">
              {products.map((product) => (
                <div className="row" key={product._id}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {product.images?.[0] && (
                      <img src={product.images[0]} alt={product.title} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
                    )}
                    <div>
                      <strong>{product.title}</strong>
                      <span>{product.category} · {product.price} ETB · Available: {product.stock} (Reserved: {product.reservedStock || 0})</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input className="stock" type="number" value={product.stock} onChange={(event) => updateStock(product, event.target.value)} title="Adjust Stock" />
                    <label className="file" title="Select product image">
                      <ImagePlus size={16} />
                      <input type="file" accept="image/*" onChange={(event) => setImageFiles({ ...imageFiles, [product._id]: event.target.files?.[0] })} />
                    </label>
                    <button className="icon" aria-label="Upload image" onClick={() => uploadImage(product._id)} type="button">
                      <ImagePlus size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>Inventory Health Summary</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              <div style={{ padding: '16px', background: 'var(--bg-subtle)', borderRadius: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--ink-500)' }}>Total Catalog Size</span>
                <strong style={{ display: 'block', fontSize: '20px', color: 'var(--forest-900)' }}>{products.length} Products</strong>
              </div>
              <div style={{ padding: '16px', background: 'var(--bg-subtle)', borderRadius: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--ink-500)' }}>Total Units in Stock</span>
                <strong style={{ display: 'block', fontSize: '20px', color: 'var(--forest-900)' }}>
                  {products.reduce((acc, p) => acc + (p.stock || 0), 0)} Units
                </strong>
              </div>
              <div style={{ padding: '16px', background: 'var(--bg-subtle)', borderRadius: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--ink-500)' }}>Reserved in Active Checkouts</span>
                <strong style={{ display: 'block', fontSize: '20px', color: 'var(--terracotta-600)' }}>
                  {products.reduce((acc, p) => acc + (p.reservedStock || 0), 0)} Units
                </strong>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: FULFILLMENT & ORDERS */}
      {activeTab === 'fulfillment' && (
        <section className="panel">
          <h2>Orders & Escrow Delivery Pipeline</h2>
          <div className="table" style={{ marginTop: '16px' }}>
            {orders.length === 0 ? (
              <p style={{ color: 'var(--ink-500)', padding: '16px 0' }}>No customer orders placed yet.</p>
            ) : (
              orders.map((order) => (
                <div className="order" key={order._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <strong>Order #{order._id}</strong>
                    <span>Items: {order.items?.map((i) => `${i.title} (x${i.qty})`).join(', ')}</span>
                    <span>
                      Escrow State: <b style={{ color: order.escrowStatus === 'FUNDS_RELEASED' ? '#16a34a' : (order.escrowStatus === 'FUNDS_HELD_IN_ESCROW' ? '#c98539' : '#3b82f6') }}>{order.escrowStatus}</b> · Fulfillment: <b>{order.fulfillmentStatus}</b>
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ color: '#183329', fontSize: '16px' }}>{order.vendorPayout} ETB</strong>
                      <span style={{ display: 'block', fontSize: '12px', color: 'var(--ink-500)' }}>Net Payout</span>
                    </div>
                    {order.escrowStatus === 'FUNDS_HELD_IN_ESCROW' && (
                      <button className="primary" onClick={() => dispatchOrder(order._id)} type="button">
                        <Truck size={16} /> Hand to Courier
                      </button>
                    )}
                    {order.escrowStatus === 'DISPATCHED' && (
                      <span style={{ fontSize: '12px', background: '#e0f2fe', color: '#0369a1', padding: '6px 12px', borderRadius: '8px', fontWeight: 600 }}>
                        In Transit with Courier
                      </span>
                    )}
                    {order.escrowStatus === 'DELIVERED' && (
                      <span style={{ fontSize: '12px', background: '#fef3c7', color: '#92400e', padding: '6px 12px', borderRadius: '8px', fontWeight: 600 }}>
                        Delivered (Awaiting 24h Inspection Window)
                      </span>
                    )}
                    {order.escrowStatus === 'FUNDS_RELEASED' && (
                      <span style={{ fontSize: '12px', background: '#dcfce7', color: '#166534', padding: '6px 12px', borderRadius: '8px', fontWeight: 600 }}>
                        Funds Settled to Payout Balance
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* TAB 3: FINANCIALS & VAT TAX LEDGER */}
      {activeTab === 'financials' && (
        <div className="grid">
          <section className="panel">
            <h2>Marketplace Financial Ledger Breakdown</h2>
            <p style={{ color: 'var(--ink-500)', fontSize: '13px', margin: '8px 0 16px' }}>
              Zero-leakage automated ledger tracking gross sales, platform commissions (2.5%), and 15% VAT statutory compliance.
            </p>
            <div className="table">
              <div className="row">
                <span>Gross Marketplace Revenue</span>
                <strong>{Math.round(totalSales).toLocaleString()} ETB</strong>
              </div>
              <div className="row">
                <span>Platform Commission Rate</span>
                <strong>2.5% ({Math.round(platformFees).toLocaleString()} ETB)</strong>
              </div>
              <div className="row">
                <span>15% Ethiopian VAT (Included in Gross)</span>
                <strong>{estimatedVatTax.toLocaleString()} ETB</strong>
              </div>
              <div className="row" style={{ background: '#f0fdf4', borderRadius: '8px', padding: '12px' }}>
                <span style={{ color: '#166534', fontWeight: 600 }}>Total Net Vendor Earnings</span>
                <strong style={{ color: '#166534', fontSize: '18px' }}>{Math.round(netEarnings).toLocaleString()} ETB</strong>
              </div>
            </div>
          </section>

          <section className="panel">
            <h2>Escrow Trust & Safety Rules</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: '10px', fontSize: '13px' }}>
                <strong style={{ display: 'block', color: 'var(--forest-900)' }}>1. Guaranteed Funds Lock</strong>
                Buyer payments are captured and locked in escrow before order dispatch notification is sent.
              </div>
              <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: '10px', fontSize: '13px' }}>
                <strong style={{ display: 'block', color: 'var(--forest-900)' }}>2. Physical Handoff QR Proof</strong>
                Courier scans physical verification upon package receipt and recipient inspection.
              </div>
              <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: '10px', fontSize: '13px' }}>
                <strong style={{ display: 'block', color: 'var(--forest-900)' }}>3. Automated Settlement</strong>
                Upon buyer confirmation or 24-hour expiration, funds automatically transition to available payout balance.
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: BANK PAYOUTS & DISBURSALS */}
      {activeTab === 'payouts' && (
        <div className="grid">
          <section className="panel">
            <h2>Commercial Bank of Ethiopia (CBE) Details</h2>
            <form onSubmit={saveBankDetails} style={{ marginTop: '16px' }}>
              <label>Bank Institution</label>
              <input value={bankDetails.bank} onChange={(event) => setBankDetails({ ...bankDetails, bank: event.target.value })} required />

              <label>Account Number</label>
              <input value={bankDetails.account} onChange={(event) => setBankDetails({ ...bankDetails, account: event.target.value })} placeholder="1000123456789" required />

              <label>Account Holder Legal Name</label>
              <input value={bankDetails.accountHolder} onChange={(event) => setBankDetails({ ...bankDetails, accountHolder: event.target.value })} placeholder="e.g. Adama Archival Audio PLC" required />

              <button className="primary" style={{ marginTop: '16px' }} type="submit">
                <Building size={16} /> Update Settlement Account
              </button>
            </form>
          </section>

          <section className="panel">
            <h2>Withdraw Payout Balance</h2>
            <div style={{ padding: '16px', background: 'var(--bg-subtle)', borderRadius: '12px', margin: '16px 0' }}>
              <span style={{ fontSize: '13px', color: 'var(--ink-500)' }}>Available for Immediate Withdrawal</span>
              <strong style={{ display: 'block', fontSize: '24px', color: 'var(--forest-900)' }}>
                {Math.round(availablePayout).toLocaleString()} ETB
              </strong>
            </div>

            <form onSubmit={requestPayout}>
              <label>Withdrawal Amount (ETB)</label>
              <input
                type="number"
                max={availablePayout}
                min="100"
                value={payoutAmount}
                onChange={(event) => setPayoutAmount(event.target.value)}
                placeholder="Enter amount to disburse"
                required
              />

              <button className="primary" style={{ marginTop: '16px', width: '100%' }} type="submit" disabled={availablePayout <= 0}>
                <DollarSign size={16} /> Request Direct Bank Transfer
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
