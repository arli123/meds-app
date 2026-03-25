import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { colors, base } from '../styles';

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [invite, setInvite] = useState(null);
  const [tokenError, setTokenError] = useState('');
  const [tokenLoading, setTokenLoading] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setTokenError('קישור ההזמנה חסר. בקש קישור מהמנהל.');
      setTokenLoading(false);
      return;
    }
    validateToken();
  }, [token]);

  const validateToken = async () => {
    setTokenLoading(true);
    const { data, error } = await supabase
      .from('invites')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !data) {
      setTokenError('קישור ההזמנה לא תקין.');
      setTokenLoading(false);
      return;
    }

    if (data.used_by) {
      setTokenError('קישור ההזמנה כבר שומש. בקש קישור חדש.');
      setTokenLoading(false);
      return;
    }

    setInvite(data);
    setTokenLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return;
    }

    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    setLoading(true);

    // Sign up
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });

    if (signUpError) {
      setError(translateError(signUpError.message));
      setLoading(false);
      return;
    }

    const userId = authData.user?.id;
    if (!userId) {
      setError('אירעה שגיאה ביצירת המשתמש. נסה שוב.');
      setLoading(false);
      return;
    }

    const isCaregiver = invite.invite_type === 'caregiver';

    // Create profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      email,
      role: isCaregiver ? 'caregiver' : 'user',
      is_admin: false,
      is_approved: false,
    });

    if (profileError) {
      setError('שגיאה ביצירת פרופיל: ' + profileError.message);
      setLoading(false);
      return;
    }

    // Mark invite as used
    const { error: inviteError } = await supabase
      .from('invites')
      .update({ used_by: userId })
      .eq('token', token);

    if (inviteError) {
      console.warn('Failed to mark invite as used:', inviteError.message);
    }

    // If caregiver, we'll link to patient after admin approval
    // (admin sets up caregiver_relationships)

    navigate('/pending');
  };

  const translateError = (msg) => {
    if (msg.includes('User already registered')) return 'כתובת האימייל כבר רשומה במערכת';
    if (msg.includes('Password should be')) return 'הסיסמה חייבת להכיל לפחות 6 תווים';
    if (msg.includes('Unable to validate')) return 'כתובת האימייל אינה תקינה';
    return msg;
  };

  if (tokenLoading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: colors.bg, direction: 'rtl', fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ textAlign: 'center', color: colors.textLight }}>בודק קישור הזמנה...</div>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: colors.bg, direction: 'rtl', fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: 16,
      }}>
        <div style={{
          background: colors.white, borderRadius: 20, padding: 32, maxWidth: 400,
          width: '100%', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: colors.danger, marginBottom: 12, fontSize: 18 }}>קישור לא תקין</h2>
          <p style={{ color: colors.textLight, marginBottom: 24, fontSize: 14 }}>{tokenError}</p>
          <Link to="/login" style={{
            ...base.btn, ...base.btnGhost,
            display: 'inline-block', textDecoration: 'none',
          }}>
            חזרה להתחברות
          </Link>
        </div>
      </div>
    );
  }

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
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>💊</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: colors.text, margin: 0 }}>
            הרשמה למערכת
          </h1>
          {invite?.invite_type === 'caregiver' && (
            <div style={{
              marginTop: 10, background: colors.warningLight, color: colors.warning,
              borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 600,
            }}>
              הזמנה לתפקיד מטפל/ת
            </div>
          )}
        </div>

        {error && <div style={base.errorBox}>{error}</div>}

        <form onSubmit={handleRegister}>
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

          <div style={{ marginBottom: 16 }}>
            <label style={base.label}>סיסמה</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="לפחות 6 תווים"
                required
                minLength={6}
                style={{ ...base.input, paddingLeft: 44 }}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 4 }}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={base.label}>אימות סיסמה</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="הכנס סיסמה שוב"
                required
                style={{ ...base.input, paddingLeft: 44 }}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 4 }}>
                {showConfirm ? '🙈' : '👁️'}
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
            {loading ? 'נרשם...' : 'הרשמה'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/login" style={{ color: colors.textLight, fontSize: 14, textDecoration: 'none' }}>
            כבר יש לך חשבון? <span style={{ color: colors.primary, fontWeight: 600 }}>כניסה</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
