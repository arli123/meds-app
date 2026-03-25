import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { colors, base } from '../styles';

const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function toDateStr(date) {
  return date.toISOString().split('T')[0];
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  return d;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export default function History({ profile }) {
  const [tab, setTab] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Daily state
  const [dailyData, setDailyData] = useState(null);

  // Weekly state
  const [weeklyData, setWeeklyData] = useState(null);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));

  // Monthly state
  const [monthlyData, setMonthlyData] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDayDetail, setSelectedDayDetail] = useState(null);

  useEffect(() => {
    if (tab === 'daily') loadDailyData(selectedDate);
  }, [tab, selectedDate]);

  useEffect(() => {
    if (tab === 'weekly') loadWeeklyData(weekStart);
  }, [tab, weekStart]);

  useEffect(() => {
    if (tab === 'monthly') loadMonthlyData(currentMonth);
  }, [tab, currentMonth]);

  const loadDailyData = async (date) => {
    setLoading(true);
    setError('');

    const { data: schedules, error: sErr } = await supabase
      .from('schedules')
      .select('*, medications(name, color)')
      .eq('user_id', profile.id)
      .eq('is_active', true)
      .order('scheduled_time');

    if (sErr) { setError(sErr.message); setLoading(false); return; }

    const scheduleIds = (schedules || []).map((s) => s.id);
    let logsMap = {};

    if (scheduleIds.length > 0) {
      const { data: logs } = await supabase
        .from('medication_logs')
        .select('*')
        .in('schedule_id', scheduleIds)
        .eq('log_date', date);
      (logs || []).forEach((l) => { logsMap[l.schedule_id] = l; });
    }

    const total = schedules?.length || 0;
    const taken = Object.values(logsMap).filter((l) => l.is_taken).length;

    setDailyData({ schedules: schedules || [], logsMap, total, taken });
    setLoading(false);
  };

  const loadWeeklyData = async (weekStartDate) => {
    setLoading(true);
    setError('');

    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));
    const startStr = toDateStr(days[0]);
    const endStr = toDateStr(days[6]);

    const { data: schedules, error: sErr } = await supabase
      .from('schedules')
      .select('*, medications(id, name, color)')
      .eq('user_id', profile.id)
      .eq('is_active', true);

    if (sErr) { setError(sErr.message); setLoading(false); return; }

    const scheduleIds = (schedules || []).map((s) => s.id);
    let logs = [];
    if (scheduleIds.length > 0) {
      const { data: logData } = await supabase
        .from('medication_logs')
        .select('*')
        .in('schedule_id', scheduleIds)
        .gte('log_date', startStr)
        .lte('log_date', endStr);
      logs = logData || [];
    }

    // Group logs by schedule_id + date
    const logMap = {};
    logs.forEach((l) => {
      const key = `${l.schedule_id}_${l.log_date}`;
      logMap[key] = l;
    });

    // Get unique medications
    const medsMap = {};
    (schedules || []).forEach((s) => {
      if (s.medications) medsMap[s.medications.id] = s.medications;
    });

    setWeeklyData({ schedules: schedules || [], days, logMap, medsMap });
    setLoading(false);
  };

  const loadMonthlyData = async (month) => {
    setLoading(true);
    setError('');

    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const startStr = toDateStr(start);
    const endStr = toDateStr(end);

    const { data: schedules, error: sErr } = await supabase
      .from('schedules')
      .select('*')
      .eq('user_id', profile.id)
      .eq('is_active', true);

    if (sErr) { setError(sErr.message); setLoading(false); return; }

    const scheduleIds = (schedules || []).map((s) => s.id);
    let logs = [];
    if (scheduleIds.length > 0) {
      const { data: logData } = await supabase
        .from('medication_logs')
        .select('*')
        .in('schedule_id', scheduleIds)
        .gte('log_date', startStr)
        .lte('log_date', endStr);
      logs = logData || [];
    }

    // Build compliance per day
    const totalSchedules = schedules?.length || 0;
    const logsByDate = {};
    logs.forEach((l) => {
      if (!logsByDate[l.log_date]) logsByDate[l.log_date] = [];
      logsByDate[l.log_date].push(l);
    });

    const compliance = {};
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const ds = toDateStr(d);
      const dayLogs = logsByDate[ds] || [];
      const takenCount = dayLogs.filter((l) => l.is_taken).length;
      compliance[ds] = totalSchedules > 0 ? takenCount / totalSchedules : null;
    }

    setMonthlyData({ compliance, start, end });
    setLoading(false);
  };

  const getDayDotColor = (ratio, dateStr) => {
    const today = toDateStr(new Date());
    if (dateStr > today) return colors.border;
    if (ratio === null) return colors.border;
    if (ratio === 1) return colors.success;
    if (ratio >= 0.5) return colors.warning;
    return colors.danger;
  };

  // Build calendar grid for monthly view
  const buildCalendarGrid = () => {
    if (!monthlyData) return [];
    const { start, end } = monthlyData;
    const firstDayOfWeek = start.getDay();
    const grid = [];

    // Leading empty cells
    for (let i = 0; i < firstDayOfWeek; i++) grid.push(null);

    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      grid.push(new Date(d));
    }

    return grid;
  };

  const tabStyle = (t) => ({
    flex: 1,
    padding: '10px 4px',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: tab === t ? 700 : 400,
    background: tab === t ? colors.primary : colors.white,
    color: tab === t ? colors.white : colors.textLight,
    borderRadius: 8,
    transition: 'all 0.15s',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  });

  return (
    <div style={{ ...base.container, paddingTop: 16, paddingBottom: 16 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.text, marginBottom: 16 }}>
        היסטוריה
      </h2>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, background: colors.bg, borderRadius: 10,
        padding: 4, marginBottom: 20, border: `1px solid ${colors.border}`,
      }}>
        <button onClick={() => setTab('daily')} style={tabStyle('daily')}>יומי</button>
        <button onClick={() => setTab('weekly')} style={tabStyle('weekly')}>שבועי</button>
        <button onClick={() => setTab('monthly')} style={tabStyle('monthly')}>חודשי</button>
      </div>

      {error && <div style={base.errorBox}>{error}</div>}

      {/* DAILY VIEW */}
      {tab === 'daily' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <label style={base.label}>בחר תאריך</label>
            <input
              type="date"
              value={selectedDate}
              max={toDateStr(new Date())}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={base.input}
            />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', color: colors.textLight }}>טוען...</div>
          ) : dailyData && (
            <>
              {/* Summary */}
              <div style={{
                ...base.card,
                background: colors.primaryLight,
                display: 'flex',
                justifyContent: 'space-around',
                textAlign: 'center',
                padding: '16px 8px',
              }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: colors.primary }}>
                    {dailyData.total}
                  </div>
                  <div style={{ fontSize: 12, color: colors.textLight }}>סה"כ</div>
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: colors.success }}>
                    {dailyData.taken}
                  </div>
                  <div style={{ fontSize: 12, color: colors.textLight }}>נלקחו</div>
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: colors.danger }}>
                    {dailyData.total - dailyData.taken}
                  </div>
                  <div style={{ fontSize: 12, color: colors.textLight }}>הוחמצו</div>
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: colors.primary }}>
                    {dailyData.total > 0 ? Math.round((dailyData.taken / dailyData.total) * 100) : 0}%
                  </div>
                  <div style={{ fontSize: 12, color: colors.textLight }}>ציות</div>
                </div>
              </div>

              {dailyData.schedules.length === 0 ? (
                <div style={{ textAlign: 'center', color: colors.textLight, padding: 30 }}>
                  אין תרופות מתוזמנות
                </div>
              ) : (
                dailyData.schedules.map((s) => {
                  const log = dailyData.logsMap[s.id];
                  const taken = log?.is_taken;
                  return (
                    <div key={s.id} style={{
                      ...base.card,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      background: taken ? colors.successLight : colors.dangerLight,
                      border: `1px solid ${taken ? colors.success : colors.danger}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 12, height: 12, borderRadius: '50%',
                          background: s.medications?.color || colors.primary,
                        }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{s.medications?.name}</div>
                          <div style={{ fontSize: 12, color: colors.textLight }}>
                            {s.scheduled_time.substring(0, 5)}
                          </div>
                        </div>
                      </div>
                      <div style={{
                        fontWeight: 700,
                        fontSize: 18,
                        color: taken ? colors.success : colors.danger,
                      }}>
                        {taken ? '✓' : '✗'}
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      )}

      {/* WEEKLY VIEW */}
      {tab === 'weekly' && (
        <div>
          {/* Week navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <button
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              style={{ ...base.btn, ...base.btnGhost, padding: '8px 14px' }}
            >
              ← שבוע קודם
            </button>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, textAlign: 'center' }}>
              <div>{toDateStr(weekStart)}</div>
              <div style={{ color: colors.textLight, fontSize: 12 }}>עד {toDateStr(addDays(weekStart, 6))}</div>
            </div>
            <button
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              disabled={addDays(weekStart, 7) > new Date()}
              style={{ ...base.btn, ...base.btnGhost, padding: '8px 14px', opacity: addDays(weekStart, 7) > new Date() ? 0.4 : 1 }}
            >
              שבוע הבא →
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', color: colors.textLight }}>טוען...</div>
          ) : weeklyData && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%', borderCollapse: 'collapse',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: 12,
              }}>
                <thead>
                  <tr>
                    <th style={{
                      padding: '8px 6px', textAlign: 'right',
                      borderBottom: `2px solid ${colors.border}`,
                      color: colors.textLight, fontWeight: 600, width: 80,
                    }}>
                      תרופה
                    </th>
                    {weeklyData.days.map((d, i) => {
                      const ds = toDateStr(d);
                      const isToday = ds === toDateStr(new Date());
                      return (
                        <th key={ds} style={{
                          padding: '8px 4px', textAlign: 'center',
                          borderBottom: `2px solid ${colors.border}`,
                          color: isToday ? colors.primary : colors.textLight,
                          fontWeight: isToday ? 700 : 600,
                          minWidth: 36,
                        }}>
                          <div>{DAYS_HE[d.getDay()]}</div>
                          <div style={{ fontSize: 11 }}>{d.getDate()}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {Object.values(weeklyData.medsMap).map((med) => {
                    const medSchedules = weeklyData.schedules.filter(
                      (s) => s.medication_id === med.id
                    );
                    return (
                      <tr key={med.id}>
                        <td style={{
                          padding: '8px 6px',
                          borderBottom: `1px solid ${colors.border}`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{
                              width: 8, height: 8, borderRadius: '50%', background: med.color,
                            }} />
                            <span style={{ fontWeight: 600, color: colors.text }}>{med.name}</span>
                          </div>
                        </td>
                        {weeklyData.days.map((d) => {
                          const ds = toDateStr(d);
                          const future = ds > toDateStr(new Date());

                          if (medSchedules.length === 0) {
                            return (
                              <td key={ds} style={{
                                padding: '8px 4px', textAlign: 'center',
                                borderBottom: `1px solid ${colors.border}`,
                                color: colors.textLight,
                              }}>—</td>
                            );
                          }

                          const allTaken = medSchedules.every((s) => {
                            const key = `${s.id}_${ds}`;
                            return weeklyData.logMap[key]?.is_taken;
                          });
                          const anyTaken = medSchedules.some((s) => {
                            const key = `${s.id}_${ds}`;
                            return weeklyData.logMap[key]?.is_taken;
                          });

                          let symbol = '—';
                          let cellColor = colors.textLight;

                          if (future) {
                            symbol = '·';
                            cellColor = colors.textLight;
                          } else if (allTaken) {
                            symbol = '✓';
                            cellColor = colors.success;
                          } else if (anyTaken) {
                            symbol = '~';
                            cellColor = colors.warning;
                          } else {
                            symbol = '✗';
                            cellColor = colors.danger;
                          }

                          return (
                            <td key={ds} style={{
                              padding: '8px 4px', textAlign: 'center',
                              borderBottom: `1px solid ${colors.border}`,
                              fontWeight: 700, color: cellColor, fontSize: 15,
                            }}>
                              {symbol}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ marginTop: 10, fontSize: 12, color: colors.textLight, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span><span style={{ color: colors.success, fontWeight: 700 }}>✓</span> נלקח הכל</span>
                <span><span style={{ color: colors.warning, fontWeight: 700 }}>~</span> חלקי</span>
                <span><span style={{ color: colors.danger, fontWeight: 700 }}>✗</span> לא נלקח</span>
                <span><span style={{ color: colors.textLight }}>—</span> לא מתוזמן</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MONTHLY VIEW */}
      {tab === 'monthly' && (
        <div>
          {/* Month navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
              style={{ ...base.btn, ...base.btnGhost, padding: '8px 14px' }}
            >
              ← חודש קודם
            </button>
            <span style={{ fontWeight: 700, fontSize: 15, color: colors.text }}>
              {currentMonth.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
              disabled={currentMonth.getMonth() >= new Date().getMonth() && currentMonth.getFullYear() >= new Date().getFullYear()}
              style={{
                ...base.btn, ...base.btnGhost, padding: '8px 14px',
                opacity: (currentMonth.getMonth() >= new Date().getMonth() && currentMonth.getFullYear() >= new Date().getFullYear()) ? 0.4 : 1,
              }}
            >
              חודש הבא →
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', color: colors.textLight }}>טוען...</div>
          ) : monthlyData && (
            <div style={base.card}>
              {/* Day labels */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
                {DAYS_HE.map((d) => (
                  <div key={d} style={{
                    textAlign: 'center', fontSize: 11, fontWeight: 700,
                    color: colors.textLight, padding: '4px 0',
                  }}>
                    {d.substring(0, 2)}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
                {buildCalendarGrid().map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} />;
                  const ds = toDateStr(day);
                  const ratio = monthlyData.compliance[ds];
                  const dotColor = getDayDotColor(ratio, ds);
                  const isToday = ds === toDateStr(new Date());
                  const isSelected = selectedDayDetail === ds;

                  return (
                    <button
                      key={ds}
                      onClick={() => {
                        setSelectedDayDetail(ds === selectedDayDetail ? null : ds);
                        if (ds !== selectedDayDetail) {
                          setSelectedDate(ds);
                          setTimeout(() => setTab('daily'), 0);
                        }
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 3,
                        padding: '6px 2px',
                        borderRadius: 8,
                        border: isToday ? `2px solid ${colors.primary}` : '2px solid transparent',
                        background: isSelected ? colors.primaryLight : 'transparent',
                        cursor: 'pointer',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                      }}
                    >
                      <span style={{
                        fontSize: 13, fontWeight: isToday ? 700 : 400,
                        color: isToday ? colors.primary : colors.text,
                      }}>
                        {day.getDate()}
                      </span>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', background: dotColor,
                      }} />
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div style={{
                marginTop: 14, paddingTop: 10, borderTop: `1px solid ${colors.border}`,
                display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: colors.textLight,
              }}>
                <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: colors.success, marginLeft: 3 }} />הכל נלקח</span>
                <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: colors.warning, marginLeft: 3 }} />חלקי</span>
                <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: colors.danger, marginLeft: 3 }} />לא נלקח</span>
                <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: colors.border, marginLeft: 3 }} />עתידי / אין נתונים</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
