import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { colors, base } from '../styles';

const DEFAULT_TIME_SLOTS = ['07:00', '12:00', '20:00'];

export default function Schedule({ profile }) {
  const [medications, setMedications] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedMed, setSelectedMed] = useState(null); // {id, name, color}
  const [newTime, setNewTime] = useState('');
  const [addingTime, setAddingTime] = useState(false);

  useEffect(() => {
    loadData();
  }, [profile.id]);

  const loadData = async () => {
    setLoading(true);

    const { data: medsData, error: medsError } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at');

    if (medsError) {
      setError('שגיאה בטעינת תרופות: ' + medsError.message);
      setLoading(false);
      return;
    }

    const { data: schedData, error: schedError } = await supabase
      .from('schedules')
      .select('*, medications(name, color)')
      .eq('user_id', profile.id)
      .eq('is_active', true)
      .order('scheduled_time');

    if (schedError) {
      setError('שגיאה בטעינת לוח זמנים: ' + schedError.message);
      setLoading(false);
      return;
    }

    setMedications(medsData || []);
    setSchedules(schedData || []);

    const existingTimes = [...new Set((schedData || []).map((s) => s.scheduled_time.substring(0, 5)))];
    const allTimes = [...new Set([...DEFAULT_TIME_SLOTS, ...existingTimes])].sort();
    setTimeSlots(allTimes);
    setLoading(false);
  };

  const handleSelectMed = (med) => {
    setSelectedMed(prev => prev?.id === med.id ? null : med);
    setError('');
  };

  const handleAssignToSlot = async (timeSlot) => {
    if (!selectedMed) {
      setError('בחר תרופה קודם');
      setTimeout(() => setError(''), 2500);
      return;
    }

    const existing = schedules.find(
      (s) => s.medication_id === selectedMed.id && s.scheduled_time.startsWith(timeSlot)
    );
    if (existing) {
      setError('תרופה זו כבר מתוזמנת לשעה זו');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const { data, error } = await supabase
      .from('schedules')
      .insert({
        user_id: profile.id,
        medication_id: selectedMed.id,
        scheduled_time: timeSlot + ':00',
        is_active: true,
      })
      .select('*, medications(name, color)')
      .single();

    if (error) {
      setError('שגיאה: ' + error.message);
    } else {
      setSchedules((prev) => [...prev, data]);
      setSuccess(`${selectedMed.name} נוסף ל-${timeSlot}`);
      setTimeout(() => setSuccess(''), 2500);
      setSelectedMed(null);
    }
  };

  const handleRemoveSchedule = async (scheduleId) => {
    const { error } = await supabase
      .from('schedules')
      .update({ is_active: false })
      .eq('id', scheduleId);

    if (error) {
      setError('שגיאה במחיקת תזמון: ' + error.message);
    } else {
      setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
    }
  };

  const handleAddTimeSlot = (e) => {
    e.preventDefault();
    if (!newTime) return;
    const normalized = newTime.substring(0, 5);
    if (timeSlots.includes(normalized)) {
      setError('שעה זו כבר קיימת');
      setTimeout(() => setError(''), 3000);
      return;
    }
    setTimeSlots((prev) => [...prev, normalized].sort());
    setNewTime('');
    setAddingTime(false);
  };

  const handleRemoveTimeSlot = (time) => {
    const hasSchedules = schedules.some((s) => s.scheduled_time.startsWith(time));
    if (hasSchedules) {
      setError('מחק קודם את התרופות בשעה זו');
      setTimeout(() => setError(''), 4000);
      return;
    }
    setTimeSlots((prev) => prev.filter((t) => t !== time));
  };

  const getSchedulesForTime = (time) =>
    schedules.filter((s) => s.scheduled_time.startsWith(time));

  if (loading) {
    return (
      <div style={{ ...base.container, paddingTop: 40, textAlign: 'center' }}>
        <p style={{ color: colors.textLight }}>טוען לוח זמנים...</p>
      </div>
    );
  }

  return (
    <div style={{ ...base.container, paddingTop: 16, paddingBottom: 16 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.text, marginBottom: 4 }}>
        לוח זמנים
      </h2>

      {error && <div style={base.errorBox}>{error}</div>}
      {success && <div style={base.successBox}>{success}</div>}

      {/* Medications - tap to select */}
      <div style={{ ...base.card, padding: '12px', marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: colors.textLight, marginBottom: 10, fontWeight: 600 }}>
          {selectedMed ? `✓ נבחר: ${selectedMed.name} — לחץ על שעה להוספה` : 'לחץ על תרופה לבחירה'}
        </p>
        {medications.length === 0 ? (
          <p style={{ fontSize: 13, color: colors.textLight }}>אין תרופות. הוסף תרופות קודם.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {medications.map((med) => {
              const isSelected = selectedMed?.id === med.id;
              return (
                <button
                  key={med.id}
                  onClick={() => handleSelectMed(med)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 20,
                    border: `2px solid ${isSelected ? colors.primary : colors.border}`,
                    background: isSelected ? colors.primaryLight : colors.white,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 14,
                    color: colors.text,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: med.color }} />
                  {med.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Time slots */}
      {timeSlots.map((time) => {
        const slotSchedules = getSchedulesForTime(time);
        return (
          <div key={time} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{
                background: colors.primary, color: colors.white,
                borderRadius: 8, padding: '3px 10px',
                fontWeight: 700, fontSize: 15,
              }}>
                {time}
              </div>
              <button
                onClick={() => handleRemoveTimeSlot(time)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textLight, fontSize: 16, padding: '2px 4px' }}
              >
                ×
              </button>
            </div>

            <div
              onClick={() => handleAssignToSlot(time)}
              style={{
                minHeight: 60,
                borderRadius: 10,
                border: `2px dashed ${selectedMed ? colors.primary : colors.border}`,
                background: selectedMed ? colors.primaryLight : colors.bg,
                padding: 8,
                cursor: selectedMed ? 'pointer' : 'default',
                transition: 'all 0.15s',
              }}
            >
              {slotSchedules.length === 0 && (
                <div style={{
                  textAlign: 'center', fontSize: 12, paddingTop: 14,
                  color: selectedMed ? colors.primary : colors.textLight,
                  fontWeight: selectedMed ? 600 : 400,
                }}>
                  {selectedMed ? 'לחץ להוספה כאן ✓' : 'ריק'}
                </div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {slotSchedules.map((s) => (
                  <div
                    key={s.id}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: colors.white, border: `1px solid ${colors.border}`,
                      borderRadius: 20, padding: '4px 10px 4px 6px',
                      fontSize: 13, fontWeight: 600,
                    }}
                  >
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.medications?.color || colors.primary }} />
                    <span style={{ color: colors.text }}>{s.medications?.name}</span>
                    <button
                      onClick={() => handleRemoveSchedule(s.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textLight, fontSize: 15, padding: '0 0 0 2px', lineHeight: 1 }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {/* Add time slot */}
      {addingTime ? (
        <form onSubmit={handleAddTimeSlot} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            required
            style={{ ...base.input, flex: 1 }}
            autoFocus
          />
          <button type="submit" style={{ ...base.btn, ...base.btnPrimary, padding: '10px 14px' }}>הוסף</button>
          <button type="button" onClick={() => setAddingTime(false)} style={{ ...base.btn, ...base.btnGhost, padding: '10px 14px' }}>ביטול</button>
        </form>
      ) : (
        <button
          onClick={() => setAddingTime(true)}
          style={{ ...base.btn, ...base.btnGhost, width: '100%', marginTop: 8, fontSize: 14 }}
        >
          + הוסף שעה
        </button>
      )}
    </div>
  );
}
