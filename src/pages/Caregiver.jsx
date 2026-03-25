import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { colors, base } from '../styles';

export default function Caregiver({ profile }) {
  const [patient, setPatient] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [medications, setMedications] = useState({});
  const [logs, setLogs] = useState({});
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reminderSent, setReminderSent] = useState(false);

  useEffect(() => {
    loadData();
  }, [profile.id]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    // Find linked patient
    const { data: rel, error: relErr } = await supabase
      .from('caregiver_relationships')
      .select('*, profiles!caregiver_relationships_patient_id_fkey(*)')
      .eq('caregiver_id', profile.id)
      .single();

    if (relErr || !rel) {
      setError('לא נמצא מטופל מקושר. פנה למנהל המערכת.');
      setLoading(false);
      return;
    }

    const patientProfile = rel.profiles;
    setPatient(patientProfile);

    const patientId = patientProfile.id;
    const today = new Date().toISOString().split('T')[0];

    // Load patient's schedules
    const { data: schedData, error: schedErr } = await supabase
      .from('schedules')
      .select('*, medications(*)')
      .eq('user_id', patientId)
      .eq('is_active', true)
      .order('scheduled_time');

    if (schedErr) {
      setError('שגיאה בטעינת לוח זמנים: ' + schedErr.message);
      setLoading(false);
      return;
    }

    // Build meds map
    const medsMap = {};
    (schedData || []).forEach((s) => {
      if (s.medications) medsMap[s.medication_id] = s.medications;
    });
    setMedications(medsMap);

    // Group by time
    const grouped = {};
    (schedData || []).forEach((s) => {
      const time = s.scheduled_time.substring(0, 5);
      if (!grouped[time]) grouped[time] = [];
      grouped[time].push(s);
    });
    setSchedules(grouped);

    // Load today's logs
    const scheduleIds = (schedData || []).map((s) => s.id);
    if (scheduleIds.length > 0) {
      const { data: logData } = await supabase
        .from('medication_logs')
        .select('*')
        .in('schedule_id', scheduleIds)
        .eq('log_date', today);

      const logsMap = {};
      (logData || []).forEach((l) => { logsMap[l.schedule_id] = l; });
      setLogs(logsMap);

      // Load weekly stats
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 6);
      const weekStartStr = weekStart.toISOString().split('T')[0];

      const { data: weekLogs } = await supabase
        .from('medication_logs')
        .select('*')
        .in('schedule_id', scheduleIds)
        .gte('log_date', weekStartStr)
        .lte('log_date', today);

      const totalPossible = scheduleIds.length * 7;
      const totalTaken = (weekLogs || []).filter((l) => l.is_taken).length;
      setWeeklyStats({
        taken: totalTaken,
        total: totalPossible,
        pct: totalPossible > 0 ? Math.round((totalTaken / totalPossible) * 100) : 0,
      });
    }

    setLoading(false);
  };

  const handleSendReminder = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('תזכורת תרופות 💊', {
        body: `תזכורת: ${patient?.email} צריך/ה לקחת תרופות`,
        icon: '/icon-192.png',
        tag: 'caregiver-reminder',
      });
    }
    setReminderSent(true);
    setTimeout(() => setReminderSent(false), 3000);
  };

  const sortedTimes = Object.keys(schedules).sort();

  const totalToday = sortedTimes.reduce((sum, t) => sum + schedules[t].length, 0);
  const takenToday = Object.values(logs).filter((l) => l.is_taken).length;
  const progressToday = totalToday > 0 ? Math.round((takenToday / totalToday) * 100) : 0;

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: colors.bg, direction: 'rtl', fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ textAlign: 'center', color: colors.textLight }}>
          <div style={{ fontSize: 40 }}>💊</div>
          <p style={{ marginTop: 12 }}>טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bg,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      direction: 'rtl',
    }}>
      {/* Caregiver Header */}
      <div style={{
        background: colors.primary,
        color: colors.white,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>🏥</span>
          <span style={{ fontSize: 17, fontWeight: 700 }}>תצוגת מטפל/ת</span>
        </div>
        <span style={{ fontSize: 13, opacity: 0.85 }}>{profile.email}</span>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px' }}>
        {error && <div style={base.errorBox}>{error}</div>}

        {patient && (
          <>
            {/* Patient info */}
            <div style={{
              ...base.card,
              background: `linear-gradient(135deg, ${colors.primary} 0%, #1d4ed8 100%)`,
              color: colors.white,
            }}>
              <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 4 }}>מטופל/ת</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>
                {patient.email}
              </div>

              {/* Today progress */}
              {totalToday > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span>היום: {takenToday} מתוך {totalToday}</span>
                    <span>{progressToday}%</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.3)', borderRadius: 4, height: 8, marginBottom: 14 }}>
                    <div style={{
                      background: colors.white, height: 8, borderRadius: 4,
                      width: `${progressToday}%`, transition: 'width 0.4s',
                    }} />
                  </div>
                </>
              )}

              {reminderSent ? (
                <div style={{
                  background: colors.successLight, color: colors.success,
                  borderRadius: 8, padding: '10px 16px', textAlign: 'center',
                  fontWeight: 700, fontSize: 14,
                }}>
                  ✓ תזכורת נשלחה!
                </div>
              ) : (
                <button
                  onClick={handleSendReminder}
                  style={{
                    ...base.btn,
                    background: colors.white,
                    color: colors.primary,
                    width: '100%',
                    fontSize: 14,
                  }}
                >
                  🔔 שלח תזכורת
                </button>
              )}
            </div>

            {/* Weekly summary */}
            {weeklyStats && (
              <div style={{ ...base.card, display: 'flex', justifyContent: 'space-around', textAlign: 'center', padding: '14px 8px' }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: colors.primary }}>{weeklyStats.pct}%</div>
                  <div style={{ fontSize: 12, color: colors.textLight }}>ציות שבועי</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: colors.success }}>{weeklyStats.taken}</div>
                  <div style={{ fontSize: 12, color: colors.textLight }}>נלקחו</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: colors.danger }}>{weeklyStats.total - weeklyStats.taken}</div>
                  <div style={{ fontSize: 12, color: colors.textLight }}>הוחמצו</div>
                </div>
              </div>
            )}

            {/* Today's schedule (read-only) */}
            <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 12 }}>
              תרופות להיום
            </h3>

            {sortedTimes.length === 0 ? (
              <div style={{ ...base.card, textAlign: 'center', padding: '30px 20px', color: colors.textLight }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
                <p>אין תרופות מתוזמנות</p>
              </div>
            ) : (
              sortedTimes.map((time) => {
                const timeSchedules = schedules[time];
                const allTaken = timeSchedules.every((s) => logs[s.id]?.is_taken);

                return (
                  <div key={time} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{
                        background: allTaken ? colors.success : colors.primary,
                        color: colors.white, borderRadius: 8, padding: '4px 12px',
                        fontWeight: 700, fontSize: 16,
                      }}>
                        {time}
                      </div>
                    </div>

                    {timeSchedules.map((s) => {
                      const log = logs[s.id];
                      const isTaken = log?.is_taken;
                      const med = medications[s.medication_id];

                      return (
                        <div key={s.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '12px 14px',
                          background: isTaken ? colors.successLight : colors.white,
                          borderRadius: 10,
                          border: `1px solid ${isTaken ? colors.success : colors.border}`,
                          marginBottom: 8,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 14, height: 14, borderRadius: '50%',
                              background: med?.color || colors.primary, flexShrink: 0,
                            }} />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 15, color: isTaken ? colors.success : colors.text }}>
                                {med?.name || 'תרופה'}
                              </div>
                              {isTaken && log.taken_at && (
                                <div style={{ fontSize: 12, color: colors.success }}>
                                  נלקח ב-{new Date(log.taken_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{
                            fontSize: 20,
                            color: isTaken ? colors.success : colors.border,
                          }}>
                            {isTaken ? '✓' : '○'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}
