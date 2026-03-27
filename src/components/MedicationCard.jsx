import React from 'react';
import { colors } from '../styles';

export default function MedicationCard({ medication, schedule, log, onTake, disabled }) {
  const isTaken = log?.is_taken || false;
  const takenAt = log?.taken_at;

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{
      background: isTaken ? colors.successLight : colors.white,
      borderRadius: 12,
      border: `1px solid ${isTaken ? colors.success : colors.border}`,
      marginBottom: 10,
      overflow: 'hidden',
      transition: 'all 0.2s',
    }}>
      {/* Medication info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 10px' }}>
        <div style={{
          width: 16, height: 16, borderRadius: '50%',
          background: medication?.color || colors.primary, flexShrink: 0,
        }} />
        <div style={{ flex: 1 }}>
          <div style={{
            fontWeight: 700, fontSize: 16,
            color: isTaken ? colors.success : colors.text,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}>
            {medication?.name || 'תרופה'}
          </div>
          {isTaken && takenAt && (
            <div style={{ fontSize: 12, color: colors.success, marginTop: 2 }}>
              נלקח בשעה {formatTime(takenAt)}
            </div>
          )}
        </div>
        {isTaken && (
          <span style={{ fontSize: 22 }}>✅</span>
        )}
      </div>

      {/* Take button — full width */}
      {!isTaken && (
        <button
          onClick={() => !disabled && onTake && onTake()}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '13px',
            border: 'none',
            borderTop: `1px solid ${colors.border}`,
            background: colors.primary,
            color: colors.white,
            fontSize: 16,
            fontWeight: 700,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            letterSpacing: 0.3,
          }}
        >
          ✓ לקחתי
        </button>
      )}
    </div>
  );
}
