'use client';

import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { 
  Heart, 
  Search, 
  ShoppingBag, 
  MapPin, 
  LayoutGrid, 
  Truck, 
  FileText, 
  Store, 
  PlusCircle, 
  ShieldAlert, 
  ShieldCheck, 
  Building2, 
  Sparkles, 
  Compass, 
  MessageCircleQuestion, 
  Info, 
  HelpCircle,
  Bell, 
  Menu, 
  X 
} from 'lucide-react';
import { useAuthStore } from '../app/stores/useAuthStore';
import { useThemeStore } from '../app/stores/useThemeStore';
import styles from './PaleoNavigation.module.css';

export interface PaleoNavigationProps {
  cartCount: number;
  wishlistCount: number;
  onOpenCart: () => void;
  onOpenSell: () => void;
  onOpenSearch: () => void;
  onOpenWishlist: () => void;
  onOpenAccount: () => void;
  onOpenNotifications?: () => void;
  notificationCount?: number;
}

interface UtilityButtonProps {
  label: string;
  onClick: () => void;
  badge?: number;
  children: ReactNode;
}

/** A consistently accessible icon action used by the compact generated header. */
function UtilityButton({ label, onClick, badge, children }: UtilityButtonProps) {
  return (
    <button className={styles.utilityButton} type="button" onClick={onClick} aria-label={label} title={label}>
      {children}
      {badge ? <span className={styles.actionBadge} aria-label={`${badge} ${label.toLowerCase()} items`}>{badge}</span> : null}
    </button>
  );
}

/**
 * Generated PALEO header adapted to the storefront's existing cart, wishlist,
 * selling, search, and account flows. Synchronizes with global auth store and persistent theme.
 */
export default function PaleoNavigation({
  cartCount,
  wishlistCount,
  onOpenCart,
  onOpenSell,
  onOpenSearch,
  onOpenWishlist,
  onOpenAccount,
  onOpenNotifications,
  notificationCount = 0
}: PaleoNavigationProps) {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const toggleThemeStore = useThemeStore((state) => state.toggleTheme);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Close mobile drawer on Escape key or route change
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  // Lock body scroll when mobile drawer is active
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const toggleTheme = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    toggleThemeStore();
  };

  const displayName = user?.displayName || user?.name || (user?.telegramUsername ? `@${user.telegramUsername}` : 'Account');
  const initial = user?.displayName ? user.displayName[0] : (user?.telegramUsername ? user.telegramUsername[0] : 'U');

  const isSeller = isAuthenticated && (user?.role === 'vendor' || user?.role === 'VENDOR');
  const isBuyer = isAuthenticated && !isSeller;

  return (
    <header className={`${styles.navigationBar} ${isDarkMode ? styles.darkNavigation : ''}`}>
      {/* Brand links back to the curated marketplace home page. */}
      <Link href="/" className={styles.brand} aria-label="ገልጋይ (Gelgay) home">
        <img
          src={isDarkMode ? "/assets/gelgay_logo_lockup_dark.png" : "/assets/gelgay_logo_lockup.png"}
          alt="ገልጋይ (Gelgay)"
          style={{ height: '34px', width: 'auto', objectFit: 'contain', display: 'block' }}
        />
      </Link>

      {/* Desktop routes retain the generated navigation labels and marketplace destinations. */}
      <nav className={styles.primaryLinks} aria-label="Primary navigation">
        <Link className={styles.navLink} href="/shop">
          <ShoppingBag className={styles.navLinkIcon} aria-hidden="true" />
          <span>Shop</span>
        </Link>
        <Link className={styles.navLink} href="/shops">
          <MapPin className={styles.navLinkIcon} aria-hidden="true" />
          <span>Near Me</span>
        </Link>
        <Link className={styles.navLink} href="/categories">
          <LayoutGrid className={styles.navLinkIcon} aria-hidden="true" />
          <span>Categories</span>
        </Link>

        {/* Track is only shown for Buyer accounts */}
        {isBuyer && (
          <Link className={styles.navLink} href="/track">
            <Truck className={styles.navLinkIcon} aria-hidden="true" />
            <span>Track</span>
          </Link>
        )}

        {/* Orders, Studio Portal and Sell are only shown when logged in as Seller */}
        {isSeller && (
          <>
            <Link className={styles.navLink} href="/orders">
              <FileText className={styles.navLinkIcon} aria-hidden="true" />
              <span>Orders</span>
            </Link>
            <a className={styles.navLink} href={process.env.NEXT_PUBLIC_VENDOR_URL || '/vendor/'} target="_blank" rel="noreferrer">
              <Store className={styles.navLinkIcon} aria-hidden="true" />
              <span>Vendor Studio</span>
            </a>
            <button className={styles.navLink} type="button" onClick={onOpenSell}>
              <PlusCircle className={styles.navLinkIcon} aria-hidden="true" />
              <span>Sell</span>
            </button>
          </>
        )}

        {/* Superuser Admin Operations link */}
        {isAuthenticated && user?.role === 'admin' && (
          <a className={styles.navLink} href={process.env.NEXT_PUBLIC_ADMIN_URL || '/admin/'} target="_blank" rel="noreferrer">
            <ShieldAlert className={styles.navLinkIcon} aria-hidden="true" />
            <span>Admin Console</span>
          </a>
        )}

        <Link className={styles.navLink} href="/about">
          <Compass className={styles.navLinkIcon} aria-hidden="true" />
          <span>About</span>
        </Link>
        <Link className={styles.navLink} href="/faq">
          <MessageCircleQuestion className={styles.navLinkIcon} aria-hidden="true" />
          <span>FAQ</span>
        </Link>
      </nav>

      {/* Utility controls connect the generated visual design to existing client actions. */}
      <div className={styles.utilityActions}>
        <UtilityButton label="Search market" onClick={onOpenSearch}>
          <Search className={styles.utilityIcon} aria-hidden="true" />
        </UtilityButton>
        <UtilityButton label="View wishlist" onClick={onOpenWishlist} badge={wishlistCount}>
          <Heart className={styles.utilityIcon} aria-hidden="true" />
        </UtilityButton>

        {/* Cart is only shown for Buyer accounts */}
        {isBuyer && (
          <UtilityButton label="Open cart" onClick={onOpenCart} badge={cartCount}>
            <ShoppingBag className={styles.utilityIcon} aria-hidden="true" />
          </UtilityButton>
        )}

        {onOpenNotifications ? (
          <UtilityButton label="Activity & Alerts" onClick={onOpenNotifications} badge={notificationCount}>
            <Bell className={styles.utilityIcon} aria-hidden="true" />
          </UtilityButton>
        ) : null}

        {isAuthenticated && user ? (
          <button
            className={styles.accountButton}
            type="button"
            onClick={onOpenAccount}
            title={`Signed in as ${displayName}`}
            aria-label={`Account menu for ${displayName}`}
          >
            <div className={styles.accountAvatar}>
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={displayName}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                initial
              )}
            </div>
            <span className={styles.accountName}>{displayName}</span>
            <span className={styles.accountRoleBadge}>{user.role || 'BUYER'}</span>
          </button>
        ) : (
          <button className={styles.loginButton} type="button" onClick={onOpenAccount}>
            Sign in / Sign up
          </button>
        )}

        <button
          className={styles.themeButton}
          type="button"
          onClick={toggleTheme}
          aria-pressed={isDarkMode}
          aria-label={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
          title={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {isDarkMode ? (
            <span style={{ fontSize: '13px', lineHeight: 1 }}>🌙</span>
          ) : (
            <img src="/sun.svg" alt="" width="14" height="14" />
          )}
        </button>

        {/* Mobile Hamburger Toggle Button */}
        <button
          className={styles.hamburgerButton}
          type="button"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? (
            <X className={styles.utilityIcon} aria-hidden="true" />
          ) : (
            <Menu className={styles.utilityIcon} aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Mobile Navigation Drawer Backdrop and Panel */}
      {isMobileMenuOpen && (
        <>
          <div
            className={styles.mobileDrawerBackdrop}
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            className={`${styles.mobileDrawer} ${styles.mobileDrawerOpen} ${isDarkMode ? styles.darkMobileDrawer : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
          >
        <div className={styles.mobileDrawerHeader}>
          <Link
            href="/"
            className={styles.brand}
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="ገልጋይ (Gelgay) home"
          >
            <img
              src={isDarkMode ? "/assets/gelgay_logo_lockup_dark.png" : "/assets/gelgay_logo_lockup.png"}
              alt="ገልጋይ (Gelgay)"
              style={{ height: '30px', width: 'auto', objectFit: 'contain', display: 'block' }}
            />
          </Link>
          <div className={styles.mobileDrawerHeaderActions}>
            <button
              className={styles.themeButton}
              type="button"
              onClick={toggleTheme}
              aria-pressed={isDarkMode}
              aria-label={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
              title={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {isDarkMode ? (
                <span style={{ fontSize: '13px', lineHeight: 1 }}>🌙</span>
              ) : (
                <img src="/sun.svg" alt="" width="14" height="14" />
              )}
            </button>
            <button
              className={styles.mobileDrawerCloseBtn}
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* User Account / Sign In Banner */}
        <div className={styles.mobileAuthCard}>
          {isAuthenticated && user ? (
            <div className={styles.mobileUserBox}>
              <div className={styles.mobileUserHeader}>
                <div className={styles.accountAvatar}>
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={displayName}
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    initial
                  )}
                </div>
                <div className={styles.mobileUserInfo}>
                  <div className={styles.mobileUserName}>{displayName}</div>
                  <span className={styles.accountRoleBadge}>{user.role || 'BUYER'}</span>
                </div>
              </div>
              <button
                className={styles.mobileAccountActionBtn}
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenAccount();
                }}
              >
                Manage Profile &amp; Settings
              </button>
            </div>
          ) : (
            <button
              className={styles.mobileLoginPrimaryBtn}
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenAccount();
              }}
            >
              Sign in / Sign up
            </button>
          )}
        </div>

        {/* Primary Mobile Navigation Links */}
        <nav className={styles.mobileNavLinks} aria-label="Mobile primary navigation">
          <Link
            className={styles.mobileNavLink}
            href="/shop"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span className="flex items-center gap-2.5">
              <ShoppingBag className="w-4 h-4 text-[#C85A32]" />
              <span>Shop</span>
            </span>
            <span className={styles.mobileNavChevron}>→</span>
          </Link>
          <Link
            className={styles.mobileNavLink}
            href="/shops"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-[#C85A32]" />
              <span>Near Me</span>
            </span>
            <span className={styles.mobileNavChevron}>→</span>
          </Link>
          <Link
            className={styles.mobileNavLink}
            href="/categories"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span className="flex items-center gap-2.5">
              <LayoutGrid className="w-4 h-4 text-[#C85A32]" />
              <span>Categories</span>
            </span>
            <span className={styles.mobileNavChevron}>→</span>
          </Link>

          {isBuyer && (
            <Link
              className={styles.mobileNavLink}
              href="/track"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="flex items-center gap-2.5">
                <Truck className="w-4 h-4 text-[#C85A32]" />
                <span>Track Escrow &amp; Courier</span>
              </span>
              <span className={styles.mobileNavChevron}>→</span>
            </Link>
          )}

          {isSeller && (
            <>
              <Link
                className={styles.mobileNavLink}
                href="/orders"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-[#C85A32]" />
                  <span>Seller Orders</span>
                </span>
                <span className={styles.mobileNavChevron}>→</span>
              </Link>
              <a
                className={styles.mobileNavLink}
                href={process.env.NEXT_PUBLIC_VENDOR_URL || '/vendor/'}
                target="_blank"
                rel="noreferrer"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="flex items-center gap-2.5">
                  <Store className="w-4 h-4 text-[#C85A32]" />
                  <span>Vendor Studio Portal</span>
                </span>
                <span className={styles.mobileNavChevron}>↗</span>
              </a>
              <button
                className={styles.mobileNavLinkBtn}
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenSell();
                }}
              >
                <span className="flex items-center gap-2.5">
                  <PlusCircle className="w-4 h-4 text-[#C85A32]" />
                  <span>List New Item</span>
                </span>
                <span className={styles.mobileNavChevron}>+</span>
              </button>
            </>
          )}

          {isAuthenticated && user?.role === 'admin' && (
            <a
              className={`${styles.mobileNavLink} ${styles.mobileNavLinkAdmin}`}
              href={process.env.NEXT_PUBLIC_ADMIN_URL || '/admin/'}
              target="_blank"
              rel="noreferrer"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-[#C85A32]" />
                <span>Admin Console</span>
              </span>
              <span className={styles.mobileNavChevron}>↗</span>
            </a>
          )}

          <div className={styles.mobileNavDivider} />

          <Link
            className={styles.mobileNavLink}
            href="/buyer-protection"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#C85A32]" />
              <span>Buyer Protection</span>
            </span>
            <span className={styles.mobileNavChevron}>→</span>
          </Link>
          <Link
            className={styles.mobileNavLink}
            href="/#vendors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-[#C85A32]" />
              <span>Curated Studios &amp; Vendors</span>
            </span>
            <span className={styles.mobileNavChevron}>→</span>
          </Link>
          <Link
            className={styles.mobileNavLink}
            href="/testimonials"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-[#C85A32]" />
              <span>Collector Stories</span>
            </span>
            <span className={styles.mobileNavChevron}>→</span>
          </Link>
          <Link
            className={styles.mobileNavLink}
            href="/about"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span className="flex items-center gap-2.5">
              <Info className="w-4 h-4 text-[#C85A32]" />
              <span>About ገልጋይ (Gelgay)</span>
            </span>
            <span className={styles.mobileNavChevron}>→</span>
          </Link>
          <Link
            className={styles.mobileNavLink}
            href="/faq"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span className="flex items-center gap-2.5">
              <HelpCircle className="w-4 h-4 text-[#C85A32]" />
              <span>Frequently Asked Questions</span>
            </span>
            <span className={styles.mobileNavChevron}>→</span>
          </Link>
        </nav>

        {/* Quick Drawer Utilities */}
        <div className={styles.mobileDrawerFooter}>
          <div className={styles.mobileQuickActions}>
            <button
              className={styles.mobileQuickActionBtn}
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenSearch();
              }}
            >
              <Search size={18} />
              <span>Search</span>
            </button>

            <button
              className={styles.mobileQuickActionBtn}
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenWishlist();
              }}
            >
              <Heart size={18} />
              <span>Wishlist {wishlistCount > 0 ? `(${wishlistCount})` : ''}</span>
            </button>

            {isBuyer && (
              <button
                className={styles.mobileQuickActionBtn}
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenCart();
                }}
              >
                <ShoppingBag size={18} />
                <span>Cart {cartCount > 0 ? `(${cartCount})` : ''}</span>
              </button>
            )}

            {onOpenNotifications && (
              <button
                className={styles.mobileQuickActionBtn}
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenNotifications();
                }}
              >
                <Bell size={18} />
                <span>Alerts {notificationCount > 0 ? `(${notificationCount})` : ''}</span>
              </button>
            )}
          </div>
          <div className={styles.mobileDrawerTrustTag}>
            ገልጋይ (GELGAY) ADAMA ESCROW &amp; LOGISTICS
          </div>
        </div>
      </div>
      </>
      )}
    </header>
  );
}
