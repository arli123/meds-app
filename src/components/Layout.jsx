import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { colors } from '../styles';

export default function Layout({ children, profile, onProfileUpdate }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: '🏠', label: 'בית' },
    { path: '/medications', icon: '💊', label: 'תרופות' },
    { path: '/schedule', icon: '🕐', label: 'לוח זמנים' },
    { path: '/history', icon: '📅', label: 'היסטוריה' },
    { path: '/help', icon: '❓', label: 'עזרה' },
    ...(profile?.is_admin ? [{ path: '/admin', icon: '⚙️', label: 'ניהול' }] : []),
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bg,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      direction: 'rtl',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <header style={{
        background: colors.primary,
        color: colors.white,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>💊</span>
          <span style={{ fontSize: 18, fontWeight: 700 }}>תזכורת תרופות</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, opacity: 0.85, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile?.email}
          </span>
          <Link
            to="/change-password"
            style={{
              background: 'rgba(255,255,255,0.18)',
              color: colors.white,
              borderRadius: 6,
              padding: '5px 10px',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            🔑
          </Link>
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(255,255,255,0.18)',
              color: colors.white,
              border: 'none',
              borderRadius: 6,
              padding: '5px 10px',
              fontSize: 13,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            יציאה
          </button>
        </div>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, paddingBottom: 72, overflowY: 'auto' }}>
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: colors.white,
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 64,
        zIndex: 100,
        boxShadow: '0 -2px 8px rgba(0,0,0,0.08)',
        maxWidth: '100%',
      }}>
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: 8,
              color: isActive(item.path) ? colors.primary : colors.textLight,
              fontWeight: isActive(item.path) ? 700 : 400,
              flex: 1,
              transition: 'color 0.15s',
            }}
          >
            <span style={{ fontSize: 22 }}>{item.icon}</span>
            <span style={{ fontSize: 11, fontFamily: 'system-ui, -apple-system, sans-serif' }}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
