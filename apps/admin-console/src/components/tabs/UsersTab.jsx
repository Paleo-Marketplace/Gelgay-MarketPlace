import React from 'react';
import { ShieldCheck, Shield, Store, UserMinus } from 'lucide-react';

export function UsersTab({ users, onUpdateUserRole }) {
  return (
    <section className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2>Customer & User Accounts ({users.length})</h2>
          <p style={{ fontSize: '13px', color: 'var(--ink-500)', marginTop: 2 }}>
            Manage identity permissions, merchant store authorization, and system administrator access.
          </p>
        </div>
      </div>

      <div className="list">
        {users.map((u) => {
          const role = (u.role || 'buyer').toLowerCase();
          const userId = u.id || u._id;

          const roleColors = {
            admin: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', label: '👑 Administrator' },
            vendor: { bg: '#fef3c7', border: '#fde68a', text: '#92400e', label: '🏪 Verified Vendor' },
            courier: { bg: '#f3e8ff', border: '#e9d5ff', text: '#6b21a8', label: '🛵 Courier Dispatch' },
            buyer: { bg: '#f1f5f9', border: '#e2e8f0', text: '#475569', label: '🛍️ Buyer Account' }
          };

          const roleBadge = roleColors[role] || roleColors.buyer;

          return (
            <article className="item" key={userId}>
              {/* Left: User Identity Details */}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: role === 'admin' ? 'var(--forest-900)' : (role === 'vendor' ? '#fff7ed' : 'var(--bg-surface)'),
                  border: '1px solid var(--border-medium)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-serif)',
                  color: role === 'admin' ? '#ffffff' : (role === 'vendor' ? '#d96b43' : 'var(--forest-900)'),
                  flexShrink: 0
                }}>
                  {u.displayName ? u.displayName[0].toUpperCase() : (u.email ? u.email[0].toUpperCase() : 'U')}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '15px', color: 'var(--forest-900)' }}>
                      {u.displayName || 'Unnamed User'}
                    </strong>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: roleBadge.bg,
                      border: `1px solid ${roleBadge.border}`,
                      color: roleBadge.text,
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.3px'
                    }}>
                      {roleBadge.label}
                    </span>
                  </div>

                  <span style={{ fontSize: '13px', color: 'var(--ink-500)' }}>
                    {u.email || (u.telegramUsername ? `@${u.telegramUsername}` : 'No Email on record')}
                    {' · '}
                    Orders: <b style={{ color: 'var(--forest-900)' }}>{u.orderCount || 0}</b>
                    {' · '}
                    Phone: {u.phone || 'N/A'}
                    {' · '}
                    Loc: {u.location || 'Addis Ababa'}
                  </span>
                </div>
              </div>

              {/* Right: Parallel Action Buttons Group */}
              <div className="actions">
                {role === 'buyer' && (
                  <>
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => onUpdateUserRole(userId, 'vendor')}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      title="Promote buyer to verified vendor studio merchant"
                    >
                      <Store size={14} color="#d96b43" />
                      <span>Grant Vendor Access</span>
                    </button>

                    <button
                      className="secondary"
                      type="button"
                      onClick={() => onUpdateUserRole(userId, 'admin')}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      title="Promote account to system administrator"
                    >
                      <Shield size={14} color="#2563eb" />
                      <span>Promote to Admin</span>
                    </button>
                  </>
                )}

                {role === 'vendor' && (
                  <>
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => onUpdateUserRole(userId, 'buyer')}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}
                      title="Revoke vendor studio privileges and demote to buyer"
                    >
                      <UserMinus size={14} />
                      <span>Demote to Buyer</span>
                    </button>

                    <button
                      className="secondary"
                      type="button"
                      onClick={() => onUpdateUserRole(userId, 'admin')}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      title="Promote vendor to system administrator"
                    >
                      <Shield size={14} color="#2563eb" />
                      <span>Promote to Admin</span>
                    </button>
                  </>
                )}

                {role === 'admin' && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--forest-900)',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '0.5px'
                  }}>
                    <ShieldCheck size={14} color="#d96b43" />
                    <span>Superuser Access</span>
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
