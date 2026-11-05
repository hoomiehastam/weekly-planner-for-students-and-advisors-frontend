import { useEffect, useState } from 'react';
import {
  fetchStudentNotes,
  createStudentNote,
  updateStudentNote,
  deleteStudentNote,
} from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { formatJalaliDateTime, formatRelativeTime, toFaDigits } from '../../utils/jalali';
import ConfirmModal from '../ConfirmModal';
import Ico from '../Ico';

const MAX = 4000;

// یادداشت‌های خصوصیِ مشاور درباره‌ی یک دانش‌آموز (فهرست تاریخ‌دار).
// سرور فقط به نویسنده می‌دهد؛ دانش‌آموز و والد هرگز این بخش را نمی‌بینند.
export default function StudentNotes({ studentId }) {
  const toast = useToast();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    let cancelled = false;
     
    setLoading(true);
    fetchStudentNotes(studentId)
      .then((d) => { if (!cancelled) setNotes(d.notes || []); })
      .catch((err) => { if (!cancelled) toast.error(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    try {
      const d = await createStudentNote(studentId, text.trim());
      setNotes((prev) => [d.note, ...prev]);
      setText('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(noteId) {
    if (!editText.trim()) return;
    setSaving(true);
    try {
      const d = await updateStudentNote(studentId, noteId, editText.trim());
      setNotes((prev) => prev.map((n) => (n.id === noteId ? d.note : n)));
      setEditingId(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  function askDelete(noteId) {
    setConfirm({
      message: 'این یادداشت حذف شود؟',
      onConfirm: async () => {
        setConfirm(null);
        try {
          await deleteStudentNote(studentId, noteId);
          setNotes((prev) => prev.filter((n) => n.id !== noteId));
        } catch (err) {
          toast.error(err.message);
        }
      },
    });
  }

  return (
    <section className="card notes-card" data-tour="ov-notes">
      <h3 className="card-title">
        <span aria-hidden><Ico e="🔒" /></span> یادداشت‌های خصوصی من
      </h3>
      <p className="notes-privacy">
        فقط خودت این یادداشت‌ها را می‌بینی. دانش‌آموز و والدش هیچ‌وقت آن‌ها را نمی‌بینند.
      </p>

      <form onSubmit={handleAdd} className="notes-form">
        <textarea
          rows={3}
          maxLength={MAX}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="مثلاً: ریاضی را دوست ندارد؛ بعد از ساعت ۲۱ تمرکزش کم می‌شود…"
        />
        <div className="notes-form-foot">
          <small className="muted-text">{toFaDigits(text.length)} / {toFaDigits(MAX)}</small>
          <button type="submit" className="btn-primary btn-sm" disabled={saving || !text.trim()}>
            <Ico e="＋" /> افزودن یادداشت
          </button>
        </div>
      </form>

      {loading ? (
        <p className="muted-text">در حال بارگذاری…</p>
      ) : notes.length === 0 ? (
        <p className="muted-text">هنوز یادداشتی برای این دانش‌آموز ننوشته‌ای.</p>
      ) : (
        <ul className="notes-list">
          {notes.map((n) => (
            <li key={n.id} className="note-item">
              {editingId === n.id ? (
                <>
                  <textarea rows={3} maxLength={MAX} value={editText} onChange={(e) => setEditText(e.target.value)} />
                  <div className="note-actions">
                    <button type="button" className="btn-primary btn-sm" disabled={saving || !editText.trim()} onClick={() => handleSaveEdit(n.id)}>ذخیره</button>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => setEditingId(null)}>انصراف</button>
                  </div>
                </>
              ) : (
                <>
                  <p className="note-text">{n.content}</p>
                  <div className="note-foot">
                    <span className="muted-text" title={formatJalaliDateTime(n.createdAt)}>
                      {formatRelativeTime(n.createdAt)}
                      {n.updatedAt && new Date(n.updatedAt).getTime() - new Date(n.createdAt).getTime() > 2000 ? ' · ویرایش‌شده' : ''}
                    </span>
                    <span className="note-actions">
                      <button type="button" className="btn-icon edit" title="ویرایش" onClick={() => { setEditingId(n.id); setEditText(n.content); }}><Ico e="✎" /></button>
                      <button type="button" className="btn-icon danger" title="حذف" onClick={() => askDelete(n.id)}><Ico e="🗑" /></button>
                    </span>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {confirm && (
        <ConfirmModal message={confirm.message} danger confirmText="حذف" onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />
      )}
    </section>
  );
}
