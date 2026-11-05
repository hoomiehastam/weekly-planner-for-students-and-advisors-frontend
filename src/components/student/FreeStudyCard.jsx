import { useEffect, useMemo, useState } from 'react';
import {
  fetchStudyTags,
  createStudyEntry,
  updateStudyEntry,
  deleteStudyEntry,
} from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { formatJalaliDate, toFaDigits } from '../../utils/jalali';
import { dateKey, keyToDate } from '../../utils/studyData';
import FaNumberInput from '../FaNumberInput';
import JalaliDatePicker from '../JalaliDatePicker';
import TimeInput from '../TimeInput';
import ConfirmModal from '../ConfirmModal';
import CustomSelect from '../CustomSelect';
import Ico from '../Ico';

function fmtMinutes(m) {
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h && r) return `${toFaDigits(h)} ساعت و ${toFaDigits(r)} دقیقه`;
  if (h) return `${toFaDigits(h)} ساعت`;
  return `${toFaDigits(r)} دقیقه`;
}

function blankForm() {
  return {
    studyDay: dateKey(new Date()),
    subject: '', chapter: '', tagName: '',
    mode: 'time', startTime: '', endTime: '', minutes: '',
    testsTaken: '', note: '',
  };
}

// «مطالعه‌ی آزاد»: برنامه‌ی مشاور پیشنهادی است؛ دانش‌آموز هر درسی را که در هر مدتی خوانده
// (حتی اگر در برنامه نبوده) خودش اینجا وارد می‌کند و مشاور و والد آن را می‌بینند.
// props:
//   entries           ثبت‌های فعلی
//   onEntriesChange   (newEntries) => void  — فقط وقتی canEdit
//   canEdit           فرم ثبت و ویرایش/حذف (دانش‌آموز)؛ وگرنه فقط‌خواندنی (مشاور/والد)
//   subjectSuggestions نام درس‌های برنامه برای پیشنهاد در فیلد درس
export default function FreeStudyCard({ entries, onEntriesChange, canEdit = false, subjectSuggestions = [] }) {
  const toast = useToast();
  const [tags, setTags] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    if (!canEdit) return;
    fetchStudyTags().then((d) => setTags(d.tags || [])).catch(() => {});
  }, [canEdit]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  function startEdit(e) {
    setEditingId(e.id);
    setError('');
    setForm({
      studyDay: e.studyDay,
      subject: e.subject || '',
      chapter: e.chapter || '',
      tagName: e.tagName || '',
      mode: e.startTime && e.endTime ? 'time' : 'minutes',
      startTime: e.startTime || '',
      endTime: e.endTime || '',
      minutes: e.minutes ? String(e.minutes) : '',
      testsTaken: e.testsTaken != null ? String(e.testsTaken) : '',
      note: e.note || '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(blankForm());
    setError('');
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setError('');
    if (!form.subject.trim()) { setError('نام درس را بنویس'); return; }
    const payload = {
      studyDay: form.studyDay,
      subject: form.subject.trim(),
      chapter: form.chapter.trim() || null,
      tagName: form.tagName || null,
      testsTaken: form.testsTaken === '' ? null : Number(form.testsTaken),
      note: form.note.trim() || null,
    };
    if (form.mode === 'time') {
      if (!form.startTime || !form.endTime) { setError('ساعت شروع و پایان را کامل وارد کن'); return; }
      payload.startTime = form.startTime;
      payload.endTime = form.endTime;
    } else {
      if (!form.minutes) { setError('تعداد دقیقه را وارد کن'); return; }
      payload.minutes = Number(form.minutes);
    }
    setSaving(true);
    try {
      if (editingId) {
        const d = await updateStudyEntry(editingId, payload);
        onEntriesChange(entries.map((x) => (x.id === editingId ? d.entry : x)));
        toast.success('ثبت ویرایش شد');
      } else {
        const d = await createStudyEntry(payload);
        onEntriesChange([d.entry, ...entries]);
        toast.success('مطالعه‌ات ثبت شد');
      }
      setEditingId(null);
      // درس و روز می‌مانند تا ثبت بعدی همان روز سریع‌تر باشد
      setForm({ ...blankForm(), studyDay: form.studyDay });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function askDelete(id) {
    setConfirm({
      message: 'این ثبت حذف شود؟',
      onConfirm: async () => {
        setConfirm(null);
        try {
          await deleteStudyEntry(id);
          onEntriesChange(entries.filter((x) => x.id !== id));
        } catch (err) {
          toast.error(err.message);
        }
      },
    });
  }

  // گروه‌بندی بر اساس روز (جدیدترین اول)
  const groups = useMemo(() => {
    const map = new Map();
    for (const e of entries) {
      if (!map.has(e.studyDay)) map.set(e.studyDay, []);
      map.get(e.studyDay).push(e);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([day, list]) => ({ day, list, total: list.reduce((s, x) => s + (x.minutes || 0), 0) }));
  }, [entries]);

  const suggestions = useMemo(() => Array.from(new Set(subjectSuggestions.filter(Boolean))), [subjectSuggestions]);

  return (
    <section className="card free-study-card" data-tour="free-study">
      <h3 className="card-title">
        <span aria-hidden><Ico e="📚" /></span> {canEdit ? 'مطالعه‌ی آزاد من' : 'مطالعه‌ی آزاد دانش‌آموز'}
      </h3>
      <p className="muted-text">
        {canEdit
          ? 'برنامه‌ی مشاورت پیشنهادی است. هر درسی را که در هر مدتی خواندی — حتی اگر در برنامه نبود — اینجا ثبت کن تا مشاورت ببیند و در آمار بیاید.'
          : 'درس‌هایی که دانش‌آموز خودش، جدا از برنامه‌ی تو، خوانده و ثبت کرده است.'}
      </p>

      {canEdit && (
        <form className="free-study-form" onSubmit={handleSubmit}>
          <div className="free-study-grid">
            <div className="builder-field">
              <span>روز مطالعه</span>
              <JalaliDatePicker value={form.studyDay} onChange={(v) => set({ studyDay: v })} placeholder="انتخاب روز" />
            </div>
            <label className="builder-field">
              <span>نام درس</span>
              <input
                type="text"
                list="free-study-subjects"
                value={form.subject}
                onChange={(e) => set({ subject: e.target.value })}
                placeholder="مثلاً زیست‌شناسی"
                maxLength={100}
              />
              <datalist id="free-study-subjects">
                {suggestions.map((s) => <option key={s} value={s} />)}
              </datalist>
            </label>
            <label className="builder-field">
              <span>فصل / بخش (اختیاری)</span>
              <input type="text" value={form.chapter} onChange={(e) => set({ chapter: e.target.value })} maxLength={191} placeholder="مثلاً فصل ۳" />
            </label>
            <div className="builder-field">
              <span>تگ (اختیاری)</span>
              <CustomSelect
                value={form.tagName}
                onChange={(val) => set({ tagName: val })}
                placeholder="بدون تگ"
                options={[
                  { value: '', label: 'بدون تگ' },
                  ...tags.map((t) => ({ value: t.name, label: t.name })),
                ]}
              />
            </div>
          </div>

          <div className="free-study-mode" role="radiogroup" aria-label="روش وارد کردن زمان مطالعه">
            <button
              type="button"
              className={`tab-btn-sm ${form.mode === 'time' ? 'active' : ''}`}
              onClick={() => set({ mode: 'time' })}
            >
              <i className="ti ti-clock-play" aria-hidden="true" /> بازه زمانی (از ساعت … تا …)
            </button>
            <button
              type="button"
              className={`tab-btn-sm ${form.mode === 'minutes' ? 'active' : ''}`}
              onClick={() => set({ mode: 'minutes' })}
            >
              <i className="ti ti-hourglass-empty" aria-hidden="true" /> مجموع مدت زمان (دقیقه)
            </button>
          </div>

          <div className="free-study-grid">
            {form.mode === 'time' ? (
              <>
                <label className="builder-field"><span>ساعت شروع</span>
                  <TimeInput value={form.startTime} onChange={(v) => set({ startTime: v })} />
                </label>
                <label className="builder-field"><span>ساعت پایان</span>
                  <TimeInput value={form.endTime} onChange={(v) => set({ endTime: v })} />
                </label>
              </>
            ) : (
              <label className="builder-field"><span>دقیقه</span>
                <FaNumberInput value={form.minutes} onChange={(v) => set({ minutes: v })} placeholder="مثلاً ۹۰" maxLength={4} />
              </label>
            )}
            <label className="builder-field"><span>تعداد تست (اختیاری)</span>
              <FaNumberInput value={form.testsTaken} onChange={(v) => set({ testsTaken: v })} placeholder="۰" maxLength={4} />
            </label>
            <label className="builder-field free-study-note"><span>توضیح (اختیاری)</span>
              <input type="text" value={form.note} onChange={(e) => set({ note: e.target.value })} maxLength={280} placeholder="چه کاری کردی؟" />
            </label>
          </div>

          {error && <p className="per-tag-error" role="alert"><Ico e="⚠" /> {error}</p>}
          <div className="free-study-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'در حال ثبت…' : editingId ? 'ذخیره‌ی ویرایش' : 'ثبت مطالعه'}
            </button>
            {editingId && <button type="button" className="btn-ghost" onClick={cancelEdit}>انصراف</button>}
          </div>
        </form>
      )}

      {groups.length === 0 ? (
        <p className="muted-text">
          {canEdit ? 'هنوز مطالعه‌ی آزادی ثبت نکرده‌ای.' : 'دانش‌آموز هنوز مطالعه‌ی آزادی ثبت نکرده است.'}
        </p>
      ) : (
        <div className="free-study-list">
          {groups.map((g) => (
            <div key={g.day} className="free-study-day">
              <div className="free-study-day-head">
                <strong>{formatJalaliDate(keyToDate(g.day))}</strong>
                <span className="muted-text">{fmtMinutes(g.total)}</span>
              </div>
              {g.list.map((e) => (
                <div key={e.id} className="free-study-row">
                  <div className="free-study-main">
                    <strong>{e.subject}</strong>
                    {e.chapter && <span className="task-topic">{e.chapter}</span>}
                    <div className="task-meta">
                      {e.startTime && e.endTime && <span className="time-pill" dir="rtl"><bdi>{e.startTime}</bdi> ← <bdi>{e.endTime}</bdi></span>}
                      <span className="tag-pill">{fmtMinutes(e.minutes)}</span>
                      {e.tagName && <span className="tag-pill">{e.tagName}</span>}
                      {e.testsTaken ? <span className="tag-pill">{toFaDigits(e.testsTaken)} تست</span> : null}
                    </div>
                    {e.note && <span className="task-desc">{e.note}</span>}
                  </div>
                  {canEdit && (
                    <span className="note-actions">
                      <button type="button" className="btn-icon edit" title="ویرایش" onClick={() => startEdit(e)}><Ico e="✎" /></button>
                      <button type="button" className="btn-icon danger" title="حذف" onClick={() => askDelete(e.id)}><Ico e="🗑" /></button>
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {confirm && (
        <ConfirmModal message={confirm.message} danger confirmText="حذف" onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />
      )}
    </section>
  );
}
