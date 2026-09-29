import { useEffect, useState } from 'react';
import { fetchKonkurDate } from '../../api/client';
import { konkurCountdownText } from '../../utils/konkurDate';

// بنر روزشمار تا کنکور در لندینگ — تاریخ فقط توسط سوپرادمین از پنل مدیریت تعیین می‌شود؛
// اگر تاریخی ثبت نشده باشد، این بنر اصلاً نمایش داده نمی‌شود.
export default function KonkurCountdownBanner() {
  const [text, setText] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchKonkurDate()
      .then((data) => {
        if (!alive) return;
        setText(konkurCountdownText(data.konkurDate));
      })
      .catch(() => {}); // شکست در گرفتن تاریخ نباید لندینگ را بشکند
    return () => {
      alive = false;
    };
  }, []);

  if (!text) return null;

  return (
    <div className="konkur-countdown-banner" role="status">
      <span className="kcb-icon" aria-hidden>⏳</span>
      <span className="kcb-text">{text}</span>
    </div>
  );
}
