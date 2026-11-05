import { useEffect, useState } from 'react';
import { fetchStudentNotes } from '../../api/client';
import { formatRelativeTime } from '../../utils/jalali';
import Ico from '../Ico';

// یادآورِ «یادداشت‌های خصوصی من» هنگام نوشتن برنامه: بالای فرم، خوانا و جمع‌شونده.
// (فقط‌خواندنی؛ ویرایش یادداشت‌ها در «مرور اجمالی» است.)
export default function NotesReminder({ studentId, studentName }) {
  const [notes, setNotes] = useState(null);
  const [open, setOpen] = useState(true);
  const [all, setAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchStudentNotes(studentId)
      .then((d) => { if (!cancelled) setNotes(d.notes || []); })
      .catch(() => { if (!cancelled) setNotes([]); });
    return () => { cancelled = true; };
  }, [studentId]);

  if (!notes || notes.length === 0) return null;
  const shown = all ? notes : notes.slice(0, 3);

  return (
    <aside className="notes-reminder" data-tour="pb-notes-reminder">
      <button type="button" className="notes-reminder-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span><Ico e="🔒" /> یادداشت‌های خصوصی تو درباره‌ی {studentName || 'این دانش‌آموز'}</span>
        <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} aria-hidden="true" />
      </button>
      {open && (
        <>
          <ul className="notes-reminder-list">
            {shown.map((n) => (
              <li key={n.id}>
                <p>{n.content}</p>
                <small className="muted-text">{formatRelativeTime(n.createdAt)}</small>
              </li>
            ))}
          </ul>
          {notes.length > 3 && (
            <button type="button" className="btn-ghost btn-sm" onClick={() => setAll((v) => !v)}>
              {all ? 'نمایش کمتر' : `نمایش همه (${notes.length})`}
            </button>
          )}
        </>
      )}
    </aside>
  );
}
