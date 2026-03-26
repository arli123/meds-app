import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { colors, base } from '../styles';
import MedicationCard from '../components/MedicationCard';

const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

export default function Home({ profile }) {
  const [schedules, setSchedules] = useState([]);
  const [medications, setMedications] = useState({});
  const [logs, setLogs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());
  const reminderIntervals = useRef({});

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Listen for SW messages (mark taken from notification)
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'MARK_TAKEN_FROM_NOTIFICATION') {
        const { scheduleId } = event.data;
        markTaken(scheduleId, true);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', handleMessage);
  }, [logs]);

  useEffect(() => {
    loadData();
    return () => {
      // Cleanup all intervals on unmount
      Object.keys(reminderIntervals.current).forEach((id) => {
        clearInterval(reminderIntervals.current[id]);
      });
    };
  }, [profile.id]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    const today = new Date().toISOString().split('T')[0];

    // Load schedules with medications
    const { data: scheduleData, error: scheduleError } = await supabase
      .from('schedules')
      .select('*, medications(*)')
      .eq('user_id', profile.id)
      .eq('is_active', true)
      .order('scheduled_time');

    if (scheduleError) {
      setError('שגיאה בטעינת לוח הזמנים: ' + scheduleError.message);
      setLoading(false);
      return;
    }

    // Build medications map
    const medsMap = {};
    (scheduleData || []).forEach((s) => {
      if (s.medications) medsMap[s.medication_id] = s.medications;
    });
    setMedications(medsMap);

    // Group schedules by time
    const grouped = {};
    (scheduleData || []).forEach((s) => {
      const time = s.scheduled_time.substring(0, 5);
      if (!grouped[time]) grouped[time] = [];
      grouped[time].push(s);
    });
    setSchedules(grouped);

    // Load today's logs
    const scheduleIds = (scheduleData || []).map((s) => s.id);
    if (scheduleIds.length > 0) {
      const { data: logData, error: logError } = await supabase
        .from('medication_logs')
        .select('*')
        .in('schedule_id', scheduleIds)
        .eq('log_date', today);

      if (!logError) {
        const logsMap = {};
        (logData || []).forEach((l) => { logsMap[l.schedule_id] = l; });
        setLogs(logsMap);

        // Schedule notifications for overdue untaken meds
        setTimeout(() => {
          setupReminders(scheduleData || [], logsMap);
        }, 500);
      }
    }

    setLoading(false);
  };

  const setupReminders = async (scheduleData, logsMap) => {
    const granted = await requestNotificationPermission();
    if (!granted) return;

    const nowTime = new Date();
    const [nowH, nowM] = [nowTime.getHours(), nowTime.getMinutes()];
    const today = nowTime.toISOString().split('T')[0];

    scheduleData.forEach((s) => {
      const log = logsMap[s.id];
      if (log?.is_taken) return;

      const [h, m] = s.scheduled_time.split(':').map(Number);
      const minutesPast = (nowH - h) * 60 + (nowM - m);
      const isPast = minutesPast >= 0;

      if (isPast) {
        const medName = s.medications?.name || 'תרופה';
        const timeStr = s.scheduled_time.substring(0, 5);
        scheduleHourlyReminder(timeStr, medName, s.id);

        // Alert caregiver if medication is 60+ minutes overdue
        if (minutesPast >= 60) {
          const alertKey = `caregiver_alert_${s.id}_${today}`;
          if (!localStorage.getItem(alertKey)) {
            localStorage.setItem(alertKey, '1');
            notifyCaregiver(s.id, medName, timeStr);
          }
        }
      }
    });
  };

  const notifyCaregiver = async (scheduleId, medicationName, scheduledTime) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      await fetch(`${supabaseUrl}/functions/v1/send-caregiver-alert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          patient_id: profile.id,
          medication_name: medicationName,
          scheduled_time: scheduledTime,
        }),
      });
    } catch (err) {
      console.warn('Could not notify caregiver:', err);
    }
  };

  const scheduleHourlyReminder = (scheduledTime, medicationName, scheduleId) => {
    cancelReminder(scheduleId);

    const sendNotification = () => {
      if (Notification.permission === 'granted') {
        new Notification('תזכורת תרופות 💊', {
          body: `שכחת לקחת: ${medicationName} (${scheduledTime})`,
          icon: '/icon-192.png',
          tag: `med-${scheduleId}`,
          requireInteraction: true,
        });
      }
    };

    sendNotification();
    reminderIntervals.current[scheduleId] = setInterval(sendNotification, 60 * 60 * 1000);

    // Also notify service worker
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SCHEDULE_REMINDER',
        scheduleId,
        medicationName,
        scheduledTime,
      });
    }
  };

  const cancelReminder = (scheduleId) => {
    if (reminderIntervals.current[scheduleId]) {
      clearInterval(reminderIntervals.current[scheduleId]);
      delete reminderIntervals.current[scheduleId];
    }
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CANCEL_REMINDER',
        scheduleId,
      });
    }
  };

  const markTaken = async (scheduleId, fromExternal = false) => {
    const today = new Date().toISOString().split('T')[0];
    const takenAt = new Date().toISOString();

    const { error } = await supabase.from('medication_logs').upsert({
      user_id: profile.id,
      schedule_id: scheduleId,
      log_date: today,
      is_taken: true,
      taken_at: takenAt,
    }, { onConflict: 'schedule_id,log_date' });

    if (error) {
      setError('שגיאה בעדכון: ' + error.message);
      return;
    }

    setLogs((prev) => ({
      ...prev,
      [scheduleId]: { schedule_id: scheduleId, is_taken: true, taken_at: takenAt, log_date: today },
    }));

    cancelReminder(scheduleId);
  };

  const isTimePast = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    const nowH = now.getHours();
    const nowM = now.getMinutes();
    return h < nowH || (h === nowH && m <= nowM);
  };

  const todayStr = new Date().toLocaleDateString('he-IL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const sortedTimes = Object.keys(schedules).sort();

  const totalMeds = sortedTimes.reduce((sum, t) => sum + schedules[t].length, 0);
  const takenCount = Object.values(logs).filter((l) => l.is_taken).length;
  const progress = totalMeds > 0 ? Math.round((takenCount / totalMeds) * 100) : 0;

  if (loading) {
    return (
      <div style={{ ...base.container, paddingTop: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 40 }}>💊</div>
        <p style={{ color: colors.textLight, marginTop: 12 }}>טוען תרופות...</p>
      </div>
    );
  }

  return (
    <div style={{ ...base.container, paddingTop: 16, paddingBottom: 16 }}>
      {/* Date header */}
      <div style={{
        ...base.card,
        background: `linear-gradient(135deg, ${colors.primary} 0%, #1d4ed8 100%)`,
        color: colors.white,
        textAlign: 'center',
        padding: '20px 16px',
      }}>
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 4 }}>{todayStr}</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
          תרופות להיום
        </div>

        {totalMeds > 0 && (
          <>
            <div style={{
              display: 'flex', justifyContent: 'space-between', marginBottom: 6,
              fontSize: 13,
            }}>
              <span>{takenCount} מתוך {totalMeds} נלקחו</span>
              <span>{progress}%</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.3)', borderRadius: 4, height: 8 }}>
              <div style={{
                background: colors.white, height: 8, borderRadius: 4,
                width: `${progress}%`, transition: 'width 0.4s ease',
              }} />
            </div>
          </>
        )}
      </div>

      {error && <div style={base.errorBox}>{error}</div>}

      {sortedTimes.length === 0 ? (
        <div style={{
          ...base.card, textAlign: 'center', padding: '40px 20px', color: colors.textLight,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: colors.text }}>
            אין תרופות מתוזמנות להיום
          </p>
          <p style={{ fontSize: 14 }}>
            הוסף תרופות בלשונית "תרופות" ותזמן אותן ב"לוח זמנים"
          </p>
        </div>
      ) : (
        sortedTimes.map((time) => {
          const timeSchedules = schedules[time];
          const past = isTimePast(time);
          const allTaken = timeSchedules.every((s) => logs[s.id]?.is_taken);

          return (
            <div key={time} style={{ marginBottom: 16 }}>
              {/* Time slot header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 8,
              }}>
                <div style={{
                  background: allTaken ? colors.success : (past ? colors.danger : colors.primary),
                  color: colors.white,
                  borderRadius: 8,
                  padding: '4px 12px',
                  fontWeight: 700,
                  fontSize: 16,
                  minWidth: 60,
                  textAlign: 'center',
                }}>
                  {time}
                </div>
                {past && !allTaken && (
                  <span style={{
                    fontSize: 12, color: colors.danger, fontWeight: 600,
                    background: colors.dangerLight, padding: '2px 8px', borderRadius: 4,
                  }}>
                    ⚠️ עברה השעה
                  </span>
                )}
                {allTaken && (
                  <span style={{
                    fontSize: 12, color: colors.success, fontWeight: 600,
                    background: colors.successLight, padding: '2px 8px', borderRadius: 4,
                  }}>
                    ✓ הכל נלקח
                  </span>
                )}
              </div>

              {timeSchedules.map((schedule) => (
                <MedicationCard
                  key={schedule.id}
                  medication={medications[schedule.medication_id]}
                  schedule={schedule}
                  log={logs[schedule.id]}
                  onTake={() => markTaken(schedule.id)}
                />
              ))}
            </div>
          );
        })
      )}

      {totalMeds > 0 && progress === 100 && (
        <div style={{
          ...base.card,
          background: colors.successLight,
          border: `1px solid ${colors.success}`,
          textAlign: 'center',
          padding: '20px',
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
          <p style={{ fontWeight: 700, color: colors.success, fontSize: 16 }}>
            כל התרופות להיום נלקחו!
          </p>
        </div>
      )}
    </div>
  );
}
