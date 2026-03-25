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
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 14px',
      background: isTaken ? colors.successLight : colors.white,
      borderRadius: 10,
      border: `1px solid ${isTaken ? colors.success : colors.border}`,
      marginBottom: 8,
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
        <div style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: medication?.color || colors.primary,
          flexShrink: 0,
        }} />
        <div>
          <div style={{
            fontWeight: 600,
            fontSize: 15,
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
      </div>

      <button
        onClick={() => !isTaken && !disabled && onTake && onTake()}
        disabled={isTaken || disabled}
        style={{
          border: 'none',
          borderRadius: 8,
          padding: '8px 14px',
          cursor: isTaken || disabled ? 'default' : 'pointer',
          fontSize: 14,
          fontWeight: 600,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: isTaken ? colors.success : colors.primary,
          color: colors.white,
          opacity: disabled && !isTaken ? 0.5 : 1,
          whiteSpace: 'nowrap',
          transition: 'all 0.2s',
        }}
      >
        {isTaken ? '✓ נלקח' : '✓ לקחתי'}
      </button>
    </div>
  );
}
