import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { colors, base } from '../styles';

export default function ChangePassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setError('שגיאה: ' + error.message);
    } else {
      setSuccess('הסיסמה שונתה בהצלחה!');
      setNewPassword('');
      setConfirmPassword('');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px', direction: 'rtl', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.text, marginBottom: 24 }}>שינוי סיסמה</h2>

      {error && (
        <div style={{ background: colors.dangerLight, color: colors.danger, borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ background: colors.successLight, color: colors.success, borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 14, fontWeight: 600 }}>
          {success}
        </div>
      )}

      <div style={{ background: colors.white, borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={base.label}>סיסמה חדשה</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="לפחות 6 תווים"
                required
                minLength={6}
                style={{ ...base.input, paddingLeft: 44 }}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowNew(!showNew)}
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 4 }}>
                {showNew ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={base.label}>אימות סיסמה חדשה</label>
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
            style={{ ...base.btn, ...base.btnPrimary, width: '100%', fontSize: 15, padding: '12px 20px', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'שומר...' : 'שמור סיסמה חדשה'}
          </button>
        </form>
      </div>
    </div>
  );
}
