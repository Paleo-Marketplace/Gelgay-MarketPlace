import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { ShieldCheck, Lock, Mail, ArrowRight, Sparkles, ExternalLink } from 'lucide-react';
import './styles.css';

import { api } from './api/client';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { TabNav } from './components/TabNav';
import { OverviewTab } from './components/tabs/OverviewTab';
import { ProductsTab } from './components/tabs/ProductsTab';
import { CategoriesTab } from './components/tabs/CategoriesTab';
import { CouponsTab } from './components/tabs/CouponsTab';
import { UsersTab } from './components/tabs/UsersTab';
import { DisputesTab } from './components/tabs/DisputesTab';
import { AnalyticsTab } from './components/tabs/AnalyticsTab';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);

  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [users, setUsers] = useState([]);
  const [reviewOrders, setReviewOrders] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  // Forms state
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 0
  });
  const [newCategory, setNewCategory] = useState({
    name: '',
    slug: '',
    tag: '01 / ARCHIVE',
    description: ''
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

  // Check current session
  const checkAuth = useCallback(async () => {
    setAuthChecking(true);
    try {
      const meData = await api('/api/auth/me');
      if (meData?.success && meData?.user) {
        if (meData.user.role === 'admin') {
          setCurrentUser(meData.user);
          return true;
        }
      }
      setCurrentUser(null);
      return false;
    } catch (err) {
      setCurrentUser(null);
      return false;
    } finally {
      setAuthChecking(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [
        dashboard,
        vendorData,
        productData,
        categoryData,
        couponData,
        userData,
        reviewData,
        analyticsData
      ] = await Promise.all([
        api('/api/admin/dashboard').catch(() => ({})),
        api('/api/admin/vendors').catch(() => ({})),
        api('/api/admin/products').catch(() => ({})),
        api('/api/categories').catch(() => ({})),
        api('/api/coupons').catch(() => ({})),
        api('/api/admin/users').catch(() => ({})),
        api('/api/admin/orders/review').catch(() => ({})),
        api('/api/admin/analytics/commissions').catch(() => ({}))
      ]);

      setStats(dashboard.stats || null);
      setVendors(vendorData.vendors || []);
      setProducts(productData.products || []);
      setCategories(categoryData.categories || []);
      setCoupons(couponData.coupons || []);
      setUsers(userData.users || []);
      setReviewOrders(reviewData.orders || []);
      setAnalytics(analyticsData.rows || []);
    } catch (err) {
      console.warn('Failed to load admin dataset:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth().then((isAuthed) => {
      if (isAuthed) loadAll();
    });
  }, [checkAuth, loadAll]);

  // Handle Admin Direct Sign In
  const handleAdminLogin = async (e) => {
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
        if (res.user.role !== 'admin') {
          throw new Error(`Account role is '${res.user.role}'. Only 'admin' role is authorized for this console.`);
        }
        setCurrentUser(res.user);
        setStatus('Signed in as PALEO Superuser Administrator.');
        await loadAll();
      } else {
        throw new Error(res.message || 'Login failed.');
      }
    } catch (err) {
      setLoginError(err.message || 'Invalid administrator credentials');
    } finally {
      setLoginBusy(false);
    }
  };

  // Actions
  const setKyc = async (vendorId, kycStatus) => {
    try {
      await api(`/api/admin/vendors/${vendorId}/kyc`, {
        method: 'PATCH',
        body: JSON.stringify({ kycStatus })
      });
      await loadAll();
      setStatus(`Vendor ${kycStatus}.`);
    } catch (error) {
      setStatus(error.message);
    }
  };

  const toggleProductStatus = async (productId, currentStatus) => {
    try {
      const next = currentStatus === 'approved' ? 'rejected' : 'approved';
      await api(`/api/admin/products/${productId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next })
      });
      await loadAll();
      setStatus(`Product status updated to ${next}.`);
    } catch (error) {
      setStatus(error.message);
    }
  };

  const deleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to permanently delete this product?')) return;
    try {
      await api(`/api/admin/products/${productId}`, { method: 'DELETE' });
      await loadAll();
      setStatus('Product deleted permanently.');
    } catch (error) {
      setStatus(error.message);
    }
  };

  const createCategory = async (e) => {
    e.preventDefault();
    try {
      await api('/api/categories', {
        method: 'POST',
        body: JSON.stringify(newCategory)
      });
      setNewCategory({ name: '', slug: '', tag: '01 / ARCHIVE', description: '' });
      await loadAll();
      setStatus('Dynamic category created.');
    } catch (error) {
      setStatus(error.message);
    }
  };

  const deleteCategory = async (slug) => {
    if (!window.confirm(`Delete category "${slug}"?`)) return;
    try {
      await api(`/api/categories/${slug}`, { method: 'DELETE' });
      await loadAll();
      setStatus('Category deleted.');
    } catch (error) {
      setStatus(error.message);
    }
  };

  const createCoupon = async (e) => {
    e.preventDefault();
    try {
      await api('/api/coupons', {
        method: 'POST',
        body: JSON.stringify(newCoupon)
      });
      setNewCoupon({ code: '', discountType: 'percentage', discountValue: 10, minOrderAmount: 0 });
      await loadAll();
      setStatus('Promo coupon created.');
    } catch (error) {
      setStatus(error.message);
    }
  };

  const toggleCoupon = async (code, isActive) => {
    try {
      await api(`/api/coupons/${code}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !isActive })
      });
      await loadAll();
      setStatus(`Coupon ${code} updated.`);
    } catch (error) {
      setStatus(error.message);
    }
  };

  const deleteCoupon = async (code) => {
    if (!window.confirm(`Delete coupon "${code}"?`)) return;
    try {
      await api(`/api/coupons/${code}`, { method: 'DELETE' });
      await loadAll();
      setStatus('Coupon deleted.');
    } catch (error) {
      setStatus(error.message);
    }
  };

  const updateUserRole = async (userId, role) => {
    try {
      await api(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role })
      });
      await loadAll();
      setStatus(`User role updated to ${role}.`);
    } catch (error) {
      setStatus(error.message);
    }
  };

  const approveReview = async (orderId) => {
    try {
      await api(`/api/admin/orders/${orderId}/review/approve`, { method: 'POST' });
      await loadAll();
      setStatus('Order approved and escrow funds released.');
    } catch (error) {
      setStatus(error.message);
    }
  };

  const rejectReview = async (orderId) => {
    try {
      await api(`/api/admin/orders/${orderId}/review/reject`, { method: 'POST' });
      await loadAll();
      setStatus('Order flagged for dispute investigation.');
    } catch (error) {
      setStatus(error.message);
    }
  };

  const releaseEscrow = async (vendorOrderId) => {
    try {
      await api(`/api/admin/escrow/${vendorOrderId}/release`, { method: 'POST' });
      await loadAll();
      setStatus('Escrow payout dispatched to vendor.');
    } catch (error) {
      setStatus(error.message);
    }
  };

  const exportBackup = async () => {
    try {
      const data = await api('/api/admin/export-backup');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `paleo_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setStatus('Snapshot backup exported.');
    } catch (error) {
      setStatus(error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error(error);
    } finally {
      window.location.href = 'http://localhost:3000/';
    }
  };

  // 1. Loading screen during auth initialization
  if (authChecking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f6f0', fontFamily: 'sans-serif', color: '#62726a' }}>
        <div style={{ textAlign: 'center' }}>
          <img src={`${import.meta.env.BASE_URL}gelgay_logo_lockup.png`} alt="ገልጋይ" style={{ height: '48px', width: 'auto', marginBottom: '12px', display: 'inline-block' }} />
          <div>Authenticating Superuser Credentials...</div>
        </div>
      </div>
    );
  }

  // 2. Direct Admin Login Gate if not authenticated
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <main style={{ minHeight: '100vh', background: '#10261d', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'var(--font-sans)' }}>
        <div style={{ maxWidth: '440px', width: '100%', background: '#183329', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '24px', padding: '36px', color: '#f9f6f0', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
            <img src={`${import.meta.env.BASE_URL}gelgay_icon.png`} alt="ገልጋይ" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
            <div>
              <div style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '1.5px', color: '#EB5B00', textTransform: 'uppercase' }}>
                ገልጋይ (GELGAY) · Superuser Portal
              </div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontFamily: 'var(--font-serif)', color: '#ffffff' }}>
                Admin Operations
              </h2>
            </div>
          </div>

          <p style={{ fontSize: '13px', color: '#a5b4ac', marginBottom: '24px', lineHeight: 1.5 }}>
            Authorized access only. Sign in with system administrator credentials to monitor live escrow, approve vendor KYC, and arbitrate disputes.
          </p>

          {loginError && (
            <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', color: '#fca5a5', fontSize: '12px', marginBottom: '18px', fontFamily: 'monospace' }}>
              ⚠️ {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#a5b4ac', marginBottom: '6px', textTransform: 'uppercase' }}>
                Admin Email
              </label>
              <input
                type="email"
                required
                autoComplete="username"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', background: '#10261d', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#ffffff', fontSize: '14px', outline: 'none' }}
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#a5b4ac', marginBottom: '6px', textTransform: 'uppercase' }}>
                Password
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', background: '#10261d', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#ffffff', fontSize: '14px', outline: 'none' }}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loginBusy}
              style={{ marginTop: '8px', padding: '13px', background: '#d96b43', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(217, 107, 67, 0.35)' }}
            >
              <Lock size={15} />
              <span>{loginBusy ? 'Authenticating...' : 'Unlock Admin Operations'}</span>
            </button>
          </form>

          {/* Navigation */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontSize: '11px', color: '#a5b4ac' }}>
            <a
              href="http://localhost:3000"
              style={{ color: '#a5b4ac', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>Storefront</span>
              <ExternalLink size={12} />
            </a>
          </div>

        </div>
      </main>
    );
  }

  // 3. Authenticated Superuser Dashboard
  return (
    <main className="app">
      <Header
        onExportBackup={exportBackup}
        onRefresh={loadAll}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />

      {status ? <div className="notice">{status}</div> : null}

      <MetricCards stats={stats} />

      <TabNav activeTab={activeTab} onSelectTab={setActiveTab} />

      {activeTab === 'overview' && <OverviewTab vendors={vendors} onSetKyc={setKyc} />}

      {activeTab === 'products' && (
        <ProductsTab
          products={products}
          onToggleStatus={toggleProductStatus}
          onDeleteProduct={deleteProduct}
        />
      )}

      {activeTab === 'categories' && (
        <CategoriesTab
          categories={categories}
          newCategory={newCategory}
          onChangeNewCategory={setNewCategory}
          onCreateCategory={createCategory}
          onDeleteCategory={deleteCategory}
        />
      )}

      {activeTab === 'coupons' && (
        <CouponsTab
          coupons={coupons}
          newCoupon={newCoupon}
          onChangeNewCoupon={setNewCoupon}
          onCreateCoupon={createCoupon}
          onToggleCoupon={toggleCoupon}
          onDeleteCoupon={deleteCoupon}
        />
      )}

      {activeTab === 'users' && <UsersTab users={users} onUpdateUserRole={updateUserRole} />}

      {activeTab === 'disputes' && (
        <DisputesTab
          reviewOrders={reviewOrders}
          onApproveReview={approveReview}
          onRejectReview={rejectReview}
        />
      )}

      {activeTab === 'analytics' && <AnalyticsTab analytics={analytics} onReleaseEscrow={releaseEscrow} />}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
