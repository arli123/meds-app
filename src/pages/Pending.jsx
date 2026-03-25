import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { colors, base } from '../styles';

export default function Pending() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
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
        padding: 40,
        width: '100%',
        maxWidth: 400,
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>⏳</div>

        <h1 style={{
          fontSize: 22,
          fontWeight: 700,
          color: colors.text,
          marginBottom: 16,
        }}>
          ממתין לאישור
        </h1>

        <div style={{
          background: colors.warningLight,
          border: `1px solid ${colors.warning}`,
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 24,
          color: colors.text,
          fontSize: 15,
          lineHeight: 1.7,
        }}>
          <p style={{ fontWeight: 600, color: colors.warning, marginBottom: 8 }}>
            הרישום שלך התקבל בהצלחה!
          </p>
          <p>
            החשבון שלך ממתין לאישור מנהל המערכת.
          </p>
          <p style={{ marginTop: 8, fontSize: 13, color: colors.textLight }}>
            תקבל הודעה כאשר החשבון יאושר.
          </p>
        </div>

        <div style={{
          background: colors.bg,
          borderRadius: 10,
          padding: 16,
          marginBottom: 24,
          fontSize: 13,
          color: colors.textLight,
          lineHeight: 1.6,
        }}>
          <p>לא קיבלת אישור תוך זמן סביר?</p>
          <p>פנה למנהל המערכת ישירות.</p>
        </div>

        <button
          onClick={handleLogout}
          style={{
            ...base.btn,
            ...base.btnGhost,
            width: '100%',
            fontSize: 15,
          }}
        >
          יציאה מהמערכת
        </button>
      </div>
    </div>
  );
}
