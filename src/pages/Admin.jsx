import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { colors, base } from '../styles';

export default function Admin({ profile }) {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inviteType, setInviteType] = useState('user');
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [section, setSection] = useState('pending'); // 'pending' | 'approved' | 'invites'

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    setError('');

    const [{ data: allProfiles, error: pErr }, { data: allInvites, error: iErr }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('invites').select('*').order('created_at', { ascending: false }),
    ]);

    if (pErr) { setError('שגיאה בטעינת משתמשים: ' + pErr.message); }
    if (iErr) { setError('שגיאה בטעינת הזמנות: ' + iErr.message); }

    setPendingUsers((allProfiles || []).filter((p) => !p.is_approved && p.id !== profile.id));
    setApprovedUsers((allProfiles || []).filter((p) => p.is_approved && p.id !== profile.id));
    setInvites(allInvites || []);
    setLoading(false);
  };

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3500);
  };

  const handleApprove = async (userId) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_approved: true })
      .eq('id', userId);

    if (error) {
      setError('שגיאה באישור: ' + error.message);
    } else {
      const user = pendingUsers.find((u) => u.id === userId);
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      if (user) setApprovedUsers((prev) => [{ ...user, is_approved: true }, ...prev]);
      showSuccess('המשתמש אושר בהצלחה');
    }
  };

  const handleReject = async (userId) => {
    // Delete profile — this will cascade and remove the auth user would need admin API
    // Instead, just mark as rejected by keeping is_approved: false (already the case)
    // We'll delete the profile to prevent login
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) {
      setError('שגיאה בדחיית משתמש: ' + error.message);
    } else {
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      showSuccess('המשתמש נדחה ונמחק');
    }
  };

  const handleToggleAdmin = async (userId, currentIsAdmin) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: !currentIsAdmin })
      .eq('id', userId);

    if (error) {
      setError('שגיאה בעדכון הרשאות: ' + error.message);
    } else {
      setApprovedUsers((prev) =>
        prev.map((u) => u.id === userId ? { ...u, is_admin: !currentIsAdmin } : u)
      );
      showSuccess(!currentIsAdmin ? 'הוגדר כמנהל' : 'הוסרה הרשאת מנהל');
    }
  };

  const handleCreateInvite = async () => {
    setCreatingInvite(true);
    setError('');

    const { data, error } = await supabase
      .from('invites')
      .insert({ invite_type: inviteType, created_by: profile.id })
      .select()
      .single();

    if (error) {
      setError('שגיאה ביצירת הזמנה: ' + error.message);
    } else {
      setInvites((prev) => [data, ...prev]);
      showSuccess('קישור הזמנה נוצר!');
    }
    setCreatingInvite(false);
  };

  const getInviteLink = (token) => `${window.location.origin}/register?token=${token}`;

  const copyInviteLink = async (token) => {
    try {
      await navigator.clipboard.writeText(getInviteLink(token));
      showSuccess('הקישור הועתק ללוח');
    } catch {
      showSuccess(getInviteLink(token));
    }
  };

  const formatDate = (iso) => new Date(iso).toLocaleDateString('he-IL', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const sectionBtnStyle = (s) => ({
    flex: 1,
    padding: '10px 4px',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: section === s ? 700 : 400,
    background: section === s ? colors.primary : colors.white,
    color: section === s ? colors.white : colors.textLight,
    borderRadius: 8,
    transition: 'all 0.15s',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  });

  return (
    <div style={{ ...base.container, paddingTop: 16, paddingBottom: 16 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.text, marginBottom: 16 }}>
        פאנל ניהול
      </h2>

      {/* Section tabs */}
      <div style={{
        display: 'flex', gap: 4, background: colors.bg, borderRadius: 10,
        padding: 4, marginBottom: 20, border: `1px solid ${colors.border}`,
      }}>
        <button onClick={() => setSection('pending')} style={sectionBtnStyle('pending')}>
          ממתינים {pendingUsers.length > 0 && `(${pendingUsers.length})`}
        </button>
        <button onClick={() => setSection('approved')} style={sectionBtnStyle('approved')}>
          מאושרים
        </button>
        <button onClick={() => setSection('invites')} style={sectionBtnStyle('invites')}>
          הזמנות
        </button>
      </div>

      {error && <div style={base.errorBox}>{error}</div>}
      {success && <div style={base.successBox}>{success}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', color: colors.textLight, padding: 30 }}>טוען...</div>
      ) : (
        <>
          {/* PENDING USERS */}
          {section === 'pending' && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 12 }}>
                משתמשים ממתינים לאישור ({pendingUsers.length})
              </h3>

              {pendingUsers.length === 0 ? (
                <div style={{
                  ...base.card, textAlign: 'center', padding: '30px 20px', color: colors.textLight,
                }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>✓</div>
                  <p>אין משתמשים ממתינים לאישור</p>
                </div>
              ) : (
                pendingUsers.map((user) => (
                  <div key={user.id} style={{
                    ...base.card, padding: '14px 16px',
                  }}>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, color: colors.text }}>
                        {user.email}
                      </div>
                      <div style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>
                        תפקיד: {user.role === 'caregiver' ? 'מטפל/ת' : 'משתמש'}
                        {' · '}
                        נרשם: {formatDate(user.created_at)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleApprove(user.id)}
                        style={{ ...base.btn, ...base.btnSuccess, flex: 1, padding: '8px 12px', fontSize: 14 }}
                      >
                        ✓ אשר
                      </button>
                      <button
                        onClick={() => handleReject(user.id)}
                        style={{ ...base.btn, ...base.btnDanger, flex: 1, padding: '8px 12px', fontSize: 14 }}
                      >
                        ✗ דחה
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* APPROVED USERS */}
          {section === 'approved' && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 12 }}>
                משתמשים מאושרים ({approvedUsers.length})
              </h3>

              {approvedUsers.length === 0 ? (
                <div style={{ ...base.card, textAlign: 'center', padding: '30px 20px', color: colors.textLight }}>
                  אין משתמשים מאושרים נוספים
                </div>
              ) : (
                approvedUsers.map((user) => (
                  <div key={user.id} style={{
                    ...base.card, display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', padding: '12px 16px',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.email}
                      </div>
                      <div style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>
                        {user.role === 'caregiver' ? '👤 מטפל/ת' : '👤 משתמש'}
                        {user.is_admin && ' · ⚙️ מנהל'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                      style={{
                        ...base.btn,
                        background: user.is_admin ? colors.warningLight : colors.primaryLight,
                        color: user.is_admin ? colors.warning : colors.primary,
                        border: 'none',
                        padding: '6px 12px',
                        fontSize: 12,
                        flexShrink: 0,
                      }}
                    >
                      {user.is_admin ? 'הסר מנהל' : 'הגדר מנהל'}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* INVITES */}
          {section === 'invites' && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 12 }}>
                יצירת הזמנה חדשה
              </h3>

              <div style={{ ...base.card, marginBottom: 20 }}>
                <div style={{ marginBottom: 14 }}>
                  <label style={base.label}>סוג הזמנה</label>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button
                      onClick={() => setInviteType('user')}
                      style={{
                        ...base.btn,
                        flex: 1,
                        background: inviteType === 'user' ? colors.primary : colors.bg,
                        color: inviteType === 'user' ? colors.white : colors.text,
                        border: `1px solid ${inviteType === 'user' ? colors.primary : colors.border}`,
                        padding: '9px 10px',
                        fontSize: 14,
                      }}
                    >
                      👤 משתמש רגיל
                    </button>
                    <button
                      onClick={() => setInviteType('caregiver')}
                      style={{
                        ...base.btn,
                        flex: 1,
                        background: inviteType === 'caregiver' ? colors.primary : colors.bg,
                        color: inviteType === 'caregiver' ? colors.white : colors.text,
                        border: `1px solid ${inviteType === 'caregiver' ? colors.primary : colors.border}`,
                        padding: '9px 10px',
                        fontSize: 14,
                      }}
                    >
                      🏥 מטפל/ת
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleCreateInvite}
                  disabled={creatingInvite}
                  style={{
                    ...base.btn, ...base.btnPrimary,
                    width: '100%',
                    opacity: creatingInvite ? 0.7 : 1,
                  }}
                >
                  {creatingInvite ? 'יוצר...' : '🔗 צור קישור הזמנה'}
                </button>
              </div>

              <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 12 }}>
                כל ההזמנות ({invites.length})
              </h3>

              {invites.length === 0 ? (
                <div style={{ ...base.card, textAlign: 'center', padding: '30px 20px', color: colors.textLight }}>
                  לא נוצרו הזמנות עדיין
                </div>
              ) : (
                invites.map((inv) => (
                  <div key={inv.id} style={{
                    ...base.card,
                    border: `1px solid ${inv.used_by ? colors.border : colors.primary}`,
                    background: inv.used_by ? colors.bg : colors.primaryLight,
                    padding: '12px 14px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <span style={{
                          fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                          background: inv.used_by ? colors.border : colors.primary,
                          color: inv.used_by ? colors.textLight : colors.white,
                        }}>
                          {inv.used_by ? 'שומש' : 'פעיל'}
                        </span>
                        <span style={{ marginRight: 8, fontSize: 12, color: colors.textLight }}>
                          {inv.invite_type === 'caregiver' ? '🏥 מטפל/ת' : '👤 משתמש'}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: colors.textLight }}>
                        {formatDate(inv.created_at)}
                      </span>
                    </div>

                    <div style={{
                      background: colors.white,
                      borderRadius: 6,
                      padding: '6px 10px',
                      fontSize: 11,
                      color: colors.textLight,
                      wordBreak: 'break-all',
                      marginBottom: 8,
                      direction: 'ltr',
                      textAlign: 'left',
                      fontFamily: 'monospace',
                    }}>
                      {getInviteLink(inv.token)}
                    </div>

                    {!inv.used_by && (
                      <button
                        onClick={() => copyInviteLink(inv.token)}
                        style={{
                          ...base.btn, ...base.btnGhost,
                          width: '100%', fontSize: 13, padding: '7px 14px',
                        }}
                      >
                        📋 העתק קישור
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
