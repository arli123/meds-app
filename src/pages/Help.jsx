import React, { useState } from 'react';
import { colors, base } from '../styles';

const sections = [
  {
    icon: '🏠',
    title: 'דף הבית',
    content: [
      'מציג את כל התרופות שצריך לקחת היום, מסודרות לפי שעה.',
      'לחץ על "לקחתי ✓" כשאתה לוקח תרופה — זה יירשם ביומן.',
      'אם עברה שעה ולא לקחת, תקבל תזכורת לטלפון.',
      'בחלק העליון תראה כמה אחוז מהתרופות נלקחו היום.',
    ],
  },
  {
    icon: '💊',
    title: 'תרופות',
    content: [
      'כאן מוסיפים ומוחקים תרופות.',
      'לחץ על "הוסף תרופה", הכנס שם ובחר צבע.',
      'ניתן למחוק תרופה בלחיצה על פח האשפה.',
      'תרופה שנמחקה תוסר גם מלוח הזמנים.',
    ],
  },
  {
    icon: '🕐',
    title: 'לוח זמנים',
    content: [
      'כאן קובעים מתי לקחת כל תרופה.',
      'גרור תרופה מהצד השמאלי לשעה הרצויה.',
      'בטלפון — גע בתרופה ומשוך אותה לשעה.',
      'לחץ על שעה כחולה כדי לשנות אותה.',
      'לחץ "× הוסף שעה" להוסיף זמן נוסף.',
      'לחץ × ליד השעה כדי למחוק שעה (רק אם ריקה).',
    ],
  },
  {
    icon: '📅',
    title: 'היסטוריה',
    content: [
      'מציג רשומות לקיחה לפי יום, שבוע, או חודש.',
      'ב"יומי" ניתן לבדוק כל יום בנפרד.',
      'ב"שבועי" רואים טבלה: ✓ נלקח, ~ חלקי, ✗ לא נלקח.',
      'ב"חודשי" יש לוח שנה עם נקודות צבעוניות.',
      'ירוק = 100%, כתום = חלקי, אדום = לא נלקח.',
    ],
  },
  {
    icon: '🔔',
    title: 'התראות',
    content: [
      'האפליקציה שולחת תזכורת כשעברה השעה ולא לקחת תרופה.',
      'ניתן ללחוץ "לקחתי ✓" ישירות מההתראה.',
      'יש לאשר הרשאת התראות כשהאפליקציה מבקשת.',
      'אם יש אחראי מחובר — הוא יקבל התראה אם לא נלקחה תרופה שעה אחרי זמנה.',
    ],
  },
  {
    icon: '👤',
    title: 'אחראי (Caregiver)',
    content: [
      'מנהל המערכת יכול לחבר אחראי למטופל.',
      'האחראי רואה דף מיוחד עם מצב הלקיחה של המטופל.',
      'האחראי יקבל התראה לטלפון אם המטופל לא לקח תרופה שעה אחרי זמנה.',
      'האחראי אינו יכול לערוך תרופות או לוחות זמנים.',
    ],
  },
  {
    icon: '⚙️',
    title: 'ניהול (מנהל בלבד)',
    content: [
      'מנהל יכול לאשר משתמשים חדשים.',
      'מנהל יכול ליצור קישורי הזמנה לרישום.',
      'יש שני סוגי הזמנות: "משתמש רגיל" ו"אחראי".',
    ],
  },
  {
    icon: '📱',
    title: 'התקנה כאפליקציה',
    content: [
      'ניתן להוסיף את האתר לדף הבית של הטלפון.',
      'ב-Android: תפריט דפדפן → "הוסף למסך הבית".',
      'ב-iPhone: כפתור שיתוף → "הוסף למסך הבית".',
      'לאחר ההוספה האפליקציה נפתחת כמו אפליקציה רגילה, ללא פס URL.',
    ],
  },
];

export default function Help() {
  const [open, setOpen] = useState(null);

  return (
    <div style={{ ...base.container, paddingTop: 16, paddingBottom: 16 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.text, marginBottom: 4 }}>מדריך שימוש</h2>
      <p style={{ color: colors.textLight, fontSize: 13, marginBottom: 20 }}>לחץ על נושא כדי לפתוח הסבר</p>

      {sections.map((sec, i) => (
        <div
          key={i}
          style={{ ...base.card, cursor: 'pointer', padding: 0, overflow: 'hidden', marginBottom: 10 }}
          onClick={() => setOpen(open === i ? null : i)}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>{sec.icon}</span>
              <span style={{ fontWeight: 700, fontSize: 16, color: colors.text }}>{sec.title}</span>
            </div>
            <span style={{ color: colors.textLight, fontSize: 18, transition: 'transform 0.2s', display: 'inline-block', transform: open === i ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
          </div>

          {open === i && (
            <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${colors.border}` }}>
              <ul style={{ margin: '12px 0 0', paddingRight: 20 }}>
                {sec.content.map((line, j) => (
                  <li key={j} style={{ color: colors.text, fontSize: 14, lineHeight: 1.8 }}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}

      <div style={{ ...base.card, background: colors.primaryLight, border: `1px solid ${colors.primary}`, padding: '14px 16px', marginTop: 8 }}>
        <p style={{ fontSize: 13, color: colors.primary, textAlign: 'center', margin: 0 }}>
          לתמיכה: פנה למנהל המערכת
        </p>
      </div>
    </div>
  );
}
