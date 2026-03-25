import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { colors, base } from '../styles';

const DEFAULT_TIME_SLOTS = ['07:00', '12:00', '20:00'];

export default function Schedule({ profile }) {
  const [medications, setMedications] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [schedules, setSchedules] = useState([]); // [{id, medication_id, scheduled_time}]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [newTime, setNewTime] = useState('');
  const [addingTime, setAddingTime] = useState(false);

  useEffect(() => {
    loadData();
  }, [profile.id]);

  const loadData = async () => {
    setLoading(true);

    // Load medications
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

    // Load schedules
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

    // Build unique time slots from existing schedules + defaults
    const existingTimes = [...new Set((schedData || []).map((s) => s.scheduled_time.substring(0, 5)))];
    const allTimes = [...new Set([...DEFAULT_TIME_SLOTS, ...existingTimes])].sort();
    setTimeSlots(allTimes);

    setLoading(false);
  };

  const handleDragStart = (e, medication) => {
    e.dataTransfer.setData('medicationId', medication.id);
    e.dataTransfer.setData('medicationName', medication.name);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e, timeSlot) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverSlot(timeSlot);
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = async (e, timeSlot) => {
    e.preventDefault();
    setDragOverSlot(null);

    const medicationId = e.dataTransfer.getData('medicationId');
    if (!medicationId) return;

    // Check if already scheduled at this time
    const existing = schedules.find(
      (s) => s.medication_id === medicationId && s.scheduled_time.startsWith(timeSlot)
    );
    if (existing) {
      setError('תרופה זו כבר מתוזמנת לשעה זו');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setError('');
    const { data, error } = await supabase
      .from('schedules')
      .insert({
        user_id: profile.id,
        medication_id: medicationId,
        scheduled_time: timeSlot + ':00',
        is_active: true,
      })
      .select('*, medications(name, color)')
      .single();

    if (error) {
      setError('שגיאה בהוספת תזמון: ' + error.message);
    } else {
      setSchedules((prev) => [...prev, data]);
      setSuccess('תרופה נוספה ללוח הזמנים');
      setTimeout(() => setSuccess(''), 2500);
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

  const handleAddTimeSlot = async (e) => {
    e.preventDefault();
    if (!newTime) return;

    const normalized = newTime.substring(0, 5);
    if (timeSlots.includes(normalized)) {
      setError('שעה זו כבר קיימת בלוח');
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
      setError('לא ניתן למחוק שעה עם תרופות מתוזמנות. מחק קודם את התרופות.');
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
      <p style={{ color: colors.textLight, fontSize: 13, marginBottom: 16 }}>
        גרור תרופה לשעה הרצויה
      </p>

      {error && <div style={base.errorBox}>{error}</div>}
      {success && <div style={base.successBox}>{success}</div>}

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* Medications panel (right - draggable) */}
        <div style={{ width: 130, flexShrink: 0 }}>
          <div style={{
            ...base.card,
            padding: '12px 10px',
            position: 'sticky',
            top: 70,
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: colors.textLight, marginBottom: 10, textAlign: 'center' }}>
              תרופות
            </h3>
            {medications.length === 0 ? (
              <p style={{ fontSize: 12, color: colors.textLight, textAlign: 'center' }}>
                אין תרופות
              </p>
            ) : (
              medications.map((med) => (
                <div
                  key={med.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, med)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 8px',
                    background: colors.bg,
                    borderRadius: 8,
                    marginBottom: 6,
                    cursor: 'grab',
                    border: `1px solid ${colors.border}`,
                    userSelect: 'none',
                    transition: 'box-shadow 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                >
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: med.color, flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: colors.text, wordBreak: 'break-word' }}>
                    {med.name}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Time slots panel (left) */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {timeSlots.map((time) => {
            const slotSchedules = getSchedulesForTime(time);
            const isDragOver = dragOverSlot === time;

            return (
              <div key={time} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{
                    background: colors.primary,
                    color: colors.white,
                    borderRadius: 8,
                    padding: '3px 10px',
                    fontWeight: 700,
                    fontSize: 15,
                  }}>
                    {time}
                  </div>
                  <button
                    onClick={() => handleRemoveTimeSlot(time)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: colors.textLight, fontSize: 16, padding: '2px 4px',
                      lineHeight: 1,
                    }}
                    title="הסר שעה"
                  >
                    ×
                  </button>
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={(e) => handleDragOver(e, time)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, time)}
                  style={{
                    minHeight: 60,
                    borderRadius: 10,
                    border: `2px dashed ${isDragOver ? colors.primary : colors.border}`,
                    background: isDragOver ? colors.primaryLight : colors.bg,
                    padding: 8,
                    transition: 'all 0.15s',
                  }}
                >
                  {slotSchedules.length === 0 && (
                    <div style={{
                      textAlign: 'center',
                      color: isDragOver ? colors.primary : colors.textLight,
                      fontSize: 12,
                      paddingTop: 14,
                      fontWeight: isDragOver ? 600 : 400,
                    }}>
                      {isDragOver ? 'שחרר כאן ✓' : 'גרור תרופה לכאן'}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {slotSchedules.map((s) => (
                      <div
                        key={s.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          background: colors.white,
                          border: `1px solid ${colors.border}`,
                          borderRadius: 20,
                          padding: '4px 10px 4px 6px',
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        <div style={{
                          width: 10, height: 10, borderRadius: '50%',
                          background: s.medications?.color || colors.primary,
                        }} />
                        <span style={{ color: colors.text }}>{s.medications?.name}</span>
                        <button
                          onClick={() => handleRemoveSchedule(s.id)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: colors.textLight, fontSize: 15, padding: '0 0 0 2px',
                            lineHeight: 1, marginRight: 2,
                          }}
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
              <button type="submit" style={{ ...base.btn, ...base.btnPrimary, padding: '10px 14px', whiteSpace: 'nowrap' }}>
                הוסף
              </button>
              <button type="button" onClick={() => setAddingTime(false)} style={{ ...base.btn, ...base.btnGhost, padding: '10px 14px' }}>
                ביטול
              </button>
            </form>
          ) : (
            <button
              onClick={() => setAddingTime(true)}
              style={{
                ...base.btn,
                ...base.btnGhost,
                width: '100%',
                marginTop: 8,
                fontSize: 14,
              }}
            >
              + הוסף שעה
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
