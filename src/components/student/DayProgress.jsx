import { useMemo, useState } from 'react';
import { saveSubjectProgress } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { nameKey, normalizeName } from '../../utils/planItem';
import { resolveStudyDayLocal, latestProgressBySubject } from '../../utils/studyData';
import Ico from '../Ico';

// «پیشروی امروز» — آخرِ هر روز برنامه: برای هر درسِ آن روز بنویس تا کجا رسیدی (صفحه یا درس).
// مشاور هنگام نوشتن برنامه‌ی بعد، از همین نقطه ادامه می‌دهد.
// props:
//   plan, day         برنامه و روزِ باز
//   rows              همه‌ی ثبت‌های پیشروی دانش‌آموز
//   onRowsChange      (rows) => void
export default function DayProgress({ plan, day, rows, onRowsChange }) {
  const toast = useToast();
  const studyDay = useMemo(() => resolveStudyDayLocal(plan, day.dayOfWeek), [plan, day.dayOfWeek]);
  const subjects = useMemo(() => {
    const seen = new Map();
    for (const it of day.items) {
      const name = normalizeName(it.subject);
      if (name && !seen.has(nameKey(name))) seen.set(nameKey(name), name);
    }
    return Array.from(seen.entries()).map(([key, name]) => ({ key, name }));
  }, [day.items]);

  const latest = useMemo(() => latestProgressBySubject(rows), [rows]);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);

  if (subjects.length === 0) return null;

  const todays = (key) => rows.find((r) => r.studyDay === studyDay && nameKey(r.subject) === key);
  const valueOf = (key) => (values[key] !== undefined ? values[key] : todays(key)?.position || '');
  const lastOf = (key) => latest.find((l) => l.key === key);

  async function handleSave() {
    setSaving(true);
    try {
      const items = subjects.map((s) => ({ subject: s.name, position: valueOf(s.key).trim() }));
      const d = await saveSubjectProgress({ studyDay, items });
      const keys = new Set(subjects.map((s) => s.key));
      const kept = rows.filter((r) => !(r.studyDay === studyDay && keys.has(nameKey(r.subject))));
      onRowsChange([...(d.progress || []), ...kept]);
      setValues({});
      toast.success('پیشرویِ این روز ثبت شد');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="day-progress" data-tour="day-progress">
      <div className="day-progress-title"><Ico e="🧭" /> پیشروی این روز — تا کجا رسیدی؟</div>
      <p className="muted-text">برای هر درس بنویس تا کدام صفحه یا درس خواندی (مثلاً «صفحه‌ی ۱۲۰» یا «درس ۴ — بخش ۲»).</p>
      {subjects.map((s) => {
        const last = lastOf(s.key);
        return (
          <label key={s.key} className="day-progress-row">
            <span className="day-progress-subject">{s.name}</span>
            <input
              type="text"
              value={valueOf(s.key)}
              maxLength={191}
              onChange={(e) => setValues((v) => ({ ...v, [s.key]: e.target.value }))}
              placeholder={last ? `آخرین ثبت: ${last.position}` : 'مثلاً صفحه‌ی ۱۲۰'}
            />
          </label>
        );
      })}
      <button type="button" className="btn-primary btn-sm" onClick={handleSave} disabled={saving}>
        {saving ? 'در حال ثبت…' : 'ثبت پیشروی'}
      </button>
    </div>
  );
}
