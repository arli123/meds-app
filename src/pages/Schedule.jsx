import React, { useState, useEffect, useRef } from 'react';
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
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [newTime, setNewTime] = useState('');
  const [addingTime, setAddingTime] = useState(false);

  // Touch drag state
  const touchDragMed = useRef(null);
  const ghostRef = useRef(null);

  useEffect(() => {
    loadData();
  }, [profile.id]);

  const loadData = async () => {
    setLoading(true);
    const { data: medsData, error: medsError } = await supabase
      .from('medications').select('*').eq('user_id', profile.id).order('created_at');
    if (medsError) { setError('שגיאה: ' + medsError.message); setLoading(false); return; }

    const { data: schedData, error: schedError } = await supabase
      .from('schedules').select('*, medications(name, color)')
      .eq('user_id', profile.id).eq('is_active', true).order('scheduled_time');
    if (schedError) { setError('שגיאה: ' + schedError.message); setLoading(false); return; }

    setMedications(medsData || []);
    setSchedules(schedData || []);
    const existingTimes = [...new Set((schedData || []).map(s => s.scheduled_time.substring(0, 5)))];
    setTimeSlots([...new Set([...DEFAULT_TIME_SLOTS, ...existingTimes])].sort());
    setLoading(false);
  };

  // ── Desktop drag ──
  const handleDragStart = (e, med) => {
    e.dataTransfer.setData('medicationId', med.id);
    e.dataTransfer.setData('medicationName', med.name);
    e.dataTransfer.effectAllowed = 'copy';
  };
  const handleDragOver = (e, time) => { e.preventDefault(); setDragOverSlot(time); };
  const handleDragLeave = () => setDragOverSlot(null);
  const handleDrop = async (e, time) => {
    e.preventDefault();
    setDragOverSlot(null);
    const medicationId = e.dataTransfer.getData('medicationId');
    if (!medicationId) return;
    await assignMed(medicationId, time);
  };

  // ── Touch drag ──
  const handleTouchStart = (e, med) => {
    touchDragMed.current = med;
    const touch = e.touches[0];
    const ghost = document.createElement('div');
    ghost.textContent = med.name;
    ghost.style.cssText = `position:fixed;z-index:9999;pointer-events:none;background:${colors.primary};color:#fff;padding:8px 14px;border-radius:20px;font-size:14px;font-weight:600;opacity:0.9;transform:translate(-50%,-50%);`;
    ghost.style.left = touch.clientX + 'px';
    ghost.style.top = touch.clientY + 'px';
    document.body.appendChild(ghost);
    ghostRef.current = ghost;
  };

  const handleTouchMove = (e) => {
    if (!ghostRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    ghostRef.current.style.left = touch.clientX + 'px';
    ghostRef.current.style.top = touch.clientY + 'px';

    // Highlight drop zone under finger
    ghostRef.current.style.display = 'none';
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    ghostRef.current.style.display = '';
    const slot = el?.closest('[data-timeslot]');
    setDragOverSlot(slot ? slot.dataset.timeslot : null);
  };

  const handleTouchEnd = async (e) => {
    if (ghostRef.current) { ghostRef.current.remove(); ghostRef.current = null; }
    const touch = e.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const slot = el?.closest('[data-timeslot]');
    setDragOverSlot(null);
    if (slot && touchDragMed.current) {
      await assignMed(touchDragMed.current.id, slot.dataset.timeslot);
    }
    touchDragMed.current = null;
  };

  // ── Shared assign logic ──
  const assignMed = async (medicationId, time) => {
    const existing = schedules.find(s => s.medication_id === medicationId && s.scheduled_time.startsWith(time));
    if (existing) {
      setError('תרופה זו כבר מתוזמנת לשעה זו');
      setTimeout(() => setError(''), 3000);
      return;
    }
    const { data, error } = await supabase.from('schedules')
      .insert({ user_id: profile.id, medication_id: medicationId, scheduled_time: time + ':00', is_active: true })
      .select('*, medications(name, color)').single();
    if (error) { setError('שגיאה: ' + error.message); }
    else {
      setSchedules(prev => [...prev, data]);
      setSuccess('תרופה נוספה ללוח הזמנים');
      setTimeout(() => setSuccess(''), 2500);
    }
  };

  const handleRemoveSchedule = async (id) => {
    const { error } = await supabase.from('schedules').update({ is_active: false }).eq('id', id);
    if (!error) setSchedules(prev => prev.filter(s => s.id !== id));
  };

  const handleAddTimeSlot = (e) => {
    e.preventDefault();
    if (!newTime) return;
    const norm = newTime.substring(0, 5);
    if (timeSlots.includes(norm)) { setError('שעה זו כבר קיימת'); setTimeout(() => setError(''), 3000); return; }
    setTimeSlots(prev => [...prev, norm].sort());
    setNewTime(''); setAddingTime(false);
  };

  const handleRemoveTimeSlot = (time) => {
    if (schedules.some(s => s.scheduled_time.startsWith(time))) {
      setError('מחק קודם את התרופות בשעה זו');
      setTimeout(() => setError(''), 4000);
      return;
    }
    setTimeSlots(prev => prev.filter(t => t !== time));
  };

  if (loading) return (
    <div style={{ ...base.container, paddingTop: 40, textAlign: 'center' }}>
      <p style={{ color: colors.textLight }}>טוען לוח זמנים...</p>
    </div>
  );

  return (
    <div style={{ ...base.container, paddingTop: 16, paddingBottom: 16 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.text, marginBottom: 4 }}>לוח זמנים</h2>
      <p style={{ color: colors.textLight, fontSize: 13, marginBottom: 16 }}>גרור תרופה לשעה הרצויה</p>

      {error && <div style={base.errorBox}>{error}</div>}
      {success && <div style={base.successBox}>{success}</div>}

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* Medications panel */}
        <div style={{ width: 130, flexShrink: 0 }}>
          <div style={{ ...base.card, padding: '12px 10px', position: 'sticky', top: 70 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: colors.textLight, marginBottom: 10, textAlign: 'center' }}>תרופות</h3>
            {medications.length === 0 ? (
              <p style={{ fontSize: 12, color: colors.textLight, textAlign: 'center' }}>אין תרופות</p>
            ) : medications.map(med => (
              <div
                key={med.id}
                draggable
                onDragStart={e => handleDragStart(e, med)}
                onTouchStart={e => handleTouchStart(e, med)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px', background: colors.bg, borderRadius: 8,
                  marginBottom: 6, cursor: 'grab', border: `1px solid ${colors.border}`,
                  userSelect: 'none', touchAction: 'none',
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: med.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: colors.text, wordBreak: 'break-word' }}>{med.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Time slots */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {timeSlots.map(time => {
            const slotSchedules = schedules.filter(s => s.scheduled_time.startsWith(time));
            const isOver = dragOverSlot === time;
            return (
              <div key={time} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ background: colors.primary, color: colors.white, borderRadius: 8, padding: '3px 10px', fontWeight: 700, fontSize: 15 }}>{time}</div>
                  <button onClick={() => handleRemoveTimeSlot(time)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textLight, fontSize: 16, padding: '2px 4px' }}>×</button>
                </div>
                <div
                  data-timeslot={time}
                  onDragOver={e => handleDragOver(e, time)}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, time)}
                  style={{
                    minHeight: 60, borderRadius: 10,
                    border: `2px dashed ${isOver ? colors.primary : colors.border}`,
                    background: isOver ? colors.primaryLight : colors.bg,
                    padding: 8, transition: 'all 0.15s',
                  }}
                >
                  {slotSchedules.length === 0 && (
                    <div style={{ textAlign: 'center', color: isOver ? colors.primary : colors.textLight, fontSize: 12, paddingTop: 14, fontWeight: isOver ? 600 : 400 }}>
                      {isOver ? 'שחרר כאן ✓' : 'גרור תרופה לכאן'}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {slotSchedules.map(s => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 5, background: colors.white, border: `1px solid ${colors.border}`, borderRadius: 20, padding: '4px 10px 4px 6px', fontSize: 13, fontWeight: 600 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.medications?.color || colors.primary }} />
                        <span style={{ color: colors.text }}>{s.medications?.name}</span>
                        <button onClick={() => handleRemoveSchedule(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textLight, fontSize: 15, padding: '0 0 0 2px', lineHeight: 1 }}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {addingTime ? (
            <form onSubmit={handleAddTimeSlot} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} required style={{ ...base.input, flex: 1 }} autoFocus />
              <button type="submit" style={{ ...base.btn, ...base.btnPrimary, padding: '10px 14px' }}>הוסף</button>
              <button type="button" onClick={() => setAddingTime(false)} style={{ ...base.btn, ...base.btnGhost, padding: '10px 14px' }}>ביטול</button>
            </form>
          ) : (
            <button onClick={() => setAddingTime(true)} style={{ ...base.btn, ...base.btnGhost, width: '100%', marginTop: 8, fontSize: 14 }}>+ הוסף שעה</button>
          )}
        </div>
      </div>
    </div>
  );
}
