import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { colors, base } from '../styles';

const PRESET_COLORS = [
  '#2563EB', // blue
  '#16A34A', // green
  '#DC2626', // red
  '#D97706', // amber
  '#7C3AED', // purple
  '#DB2777', // pink
];

export default function Medications({ profile }) {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    loadMedications();
  }, [profile.id]);

  const loadMedications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    if (error) {
      setError('שגיאה בטעינת תרופות: ' + error.message);
    } else {
      setMedications(data || []);
    }
    setLoading(false);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setError('');
    setSuccess('');
    setAdding(true);

    const { data, error } = await supabase
      .from('medications')
      .insert({ user_id: profile.id, name: newName.trim(), color: newColor })
      .select()
      .single();

    if (error) {
      setError('שגיאה בהוספת תרופה: ' + error.message);
    } else {
      setMedications((prev) => [data, ...prev]);
      setNewName('');
      setNewColor(PRESET_COLORS[0]);
      setSuccess('התרופה נוספה בהצלחה');
      setTimeout(() => setSuccess(''), 3000);
    }
    setAdding(false);
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    setError('');

    // Delete associated schedules first
    await supabase.from('schedules').delete().eq('medication_id', id);

    const { error } = await supabase.from('medications').delete().eq('id', id);

    if (error) {
      setError('שגיאה במחיקת תרופה: ' + error.message);
    } else {
      setMedications((prev) => prev.filter((m) => m.id !== id));
      setSuccess('התרופה נמחקה');
      setTimeout(() => setSuccess(''), 3000);
    }
    setDeletingId(null);
    setConfirmDelete(null);
  };

  return (
    <div style={{ ...base.container, paddingTop: 16, paddingBottom: 16 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.text, marginBottom: 16 }}>
        ניהול תרופות
      </h2>

      {/* Add medication form */}
      <div style={base.card}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: colors.text }}>
          הוספת תרופה חדשה
        </h3>

        {error && <div style={base.errorBox}>{error}</div>}
        {success && <div style={base.successBox}>{success}</div>}

        <form onSubmit={handleAdd}>
          <div style={{ marginBottom: 14 }}>
            <label style={base.label}>שם התרופה</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="לדוגמה: אמוקסיצילין"
              required
              style={base.input}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={base.label}>צבע</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColor(color)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: color,
                    border: newColor === color ? `3px solid ${colors.text}` : '3px solid transparent',
                    cursor: 'pointer',
                    outline: newColor === color ? `2px solid ${colors.white}` : 'none',
                    outlineOffset: -4,
                    boxShadow: newColor === color ? '0 0 0 3px ' + color + '40' : 'none',
                    transition: 'all 0.15s',
                  }}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={adding || !newName.trim()}
            style={{
              ...base.btn,
              ...base.btnPrimary,
              width: '100%',
              opacity: adding || !newName.trim() ? 0.6 : 1,
            }}
          >
            {adding ? 'מוסיף...' : '+ הוסף תרופה'}
          </button>
        </form>
      </div>

      {/* Medications list */}
      <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 10, marginTop: 4 }}>
        התרופות שלי ({medications.length})
      </h3>

      {loading ? (
        <div style={{ textAlign: 'center', color: colors.textLight, padding: 20 }}>טוען...</div>
      ) : medications.length === 0 ? (
        <div style={{
          ...base.card, textAlign: 'center', padding: '30px 20px', color: colors.textLight,
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>💊</div>
          <p>עדיין לא הוספת תרופות</p>
        </div>
      ) : (
        medications.map((med) => (
          <div key={med.id} style={{
            ...base.card,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                background: med.color, flexShrink: 0,
                boxShadow: `0 0 0 3px ${med.color}30`,
              }} />
              <span style={{ fontWeight: 600, fontSize: 15, color: colors.text }}>
                {med.name}
              </span>
            </div>

            {confirmDelete === med.id ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: colors.danger }}>בטוח?</span>
                <button
                  onClick={() => handleDelete(med.id)}
                  disabled={deletingId === med.id}
                  style={{
                    ...base.btn,
                    ...base.btnDanger,
                    padding: '6px 12px',
                    fontSize: 13,
                    opacity: deletingId === med.id ? 0.6 : 1,
                  }}
                >
                  {deletingId === med.id ? '...' : 'מחק'}
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  style={{
                    ...base.btn,
                    ...base.btnGhost,
                    padding: '6px 12px',
                    fontSize: 13,
                  }}
                >
                  ביטול
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(med.id)}
                style={{
                  ...base.btn,
                  background: colors.dangerLight,
                  color: colors.danger,
                  border: 'none',
                  padding: '6px 14px',
                  fontSize: 13,
                }}
              >
                🗑 מחק
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
