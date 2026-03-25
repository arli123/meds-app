import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { colors, base } from '../styles';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(translateError(error.message));
      setLoading(false);
      return;
    }

    // Profile check happens in App.jsx
    navigate('/');
  };

  const translateError = (msg) => {
    if (msg.includes('Invalid login credentials')) return 'אימייל או סיסמה שגויים';
    if (msg.includes('Email not confirmed')) return 'האימייל לא אושר. פנה למנהל.';
    if (msg.includes('Too many requests')) return 'יותר מדי ניסיונות. נסה שוב מאוחר יותר.';
    return msg;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${colors.primary} 0%, #1d4ed8 100%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px 16px',
      direction: 'rtl',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        background: colors.white,
        borderRadius: 20,
        padding: 32,
        width: '100%',
        maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>💊</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, margin: 0 }}>
            תזכורת תרופות
          </h1>
          <p style={{ color: colors.textLight, fontSize: 14, marginTop: 6 }}>
            היכנס לחשבון שלך
          </p>
        </div>

        {error && (
          <div style={base.errorBox}>{error}</div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={base.label}>אימייל</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={base.input}
              autoComplete="email"
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={base.label}>סיסמה</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="הכנס סיסמה"
                required
                style={{ ...base.input, paddingLeft: 44 }}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 4,
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...base.btn,
              ...base.btnPrimary,
              width: '100%',
              fontSize: 16,
              padding: '13px 20px',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'מתחבר...' : 'להתחברות'}
          </button>
        </form>

        <div style={{
          marginTop: 24,
          padding: '16px',
          background: colors.bg,
          borderRadius: 10,
          fontSize: 13,
          color: colors.textLight,
          textAlign: 'center',
          lineHeight: 1.6,
        }}>
          <p>אין לך חשבון? הרשמה מתאפשרת</p>
          <p>רק עם <strong>קישור הזמנה</strong> ממנהל המערכת.</p>
          <p style={{ marginTop: 8 }}>
            קיבלת קישור?{' '}
            <Link
              to="/register"
              style={{ color: colors.primary, fontWeight: 600, textDecoration: 'none' }}
            >
              הירשם כאן
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
