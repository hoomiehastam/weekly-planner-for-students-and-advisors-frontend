import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { toFaDigits, formatJalaliShort, toLatinDigits } from '../utils/jalali';
import { createMockExamScore, updateMockExamScore, deleteMockExamScore, fetchMockExamScores } from '../api/client';
import { useToast } from '../context/ToastContext';
import Ico from './Ico';
import FaNumberInput from './FaNumberInput';
import ConfirmModal from './ConfirmModal';
import JalaliDatePicker from './JalaliDatePicker';
import { saveOfflineMockScores, loadOfflineMockScores } from '../utils/offlineCache';

// تاریخ محلی به‌صورت YYYY-MM-DD (نه UTC) تا نزدیک نیمه‌شب یک روز جابه‌جا نشود
function toLocalYmd(date) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ظهر همان روز محلی؛ با این کار تبدیل به UTC و برگشت، روز را عوض نمی‌کند
function ymdToIso(ymd) {
  return new Date(`${ymd}T12:00:00`).toISOString();
}

// نام فارسی کلیدهای درصدِ شناخته‌شده — بقیه‌ی کلیدها همان‌طور که هست نمایش داده می‌شوند
const PERCENT_LABELS = {
  GENERAL: 'عمومی',
  SPECIFIC: 'اختصاصی',
  HUMANITIES: 'انسانی',
  MATH_PHYSICS: 'ریاضی و فیزیک',
  EXPERIMENTAL: 'تجربی',
};
const labelFor = (key) => PERCENT_LABELS[key] || key;

// ====== نمرات آزمون‌های آزمایشی + نمودار روند پیشرفت ======
// در هر سه پنل (دانش‌آموز / مشاور / والد) نمایش داده می‌شود:
//   - دانش‌آموز: می‌تواند نمره (عنوان + تاریخ + تراز + درصدها) ثبت/ویرایش/حذف کند
//   - مشاور و والد: فقط ببینند (فقط-خواندنی)
// هر مؤلفه‌ی درصد و تراز، خط جداگانه‌ای از نمودار خطی دارد.
//
// props:
//   studentId  — شناسه‌ی دانش‌آموز
//   currentUserId — شناسه‌ی کاربر لاگین‌شده (برای تعیین ویرایش‌پذیری)
//   compact    — در پنل مشاور/والد خلاصه‌تر نمایش داده شود
export default function MockExamsCard({ studentId, canEdit = false, compact = false }) {
  const [scores, setScores] = useState(null); // null یعنی هنوز لود نشده
  // access از سرور می‌آید: 'SELF' | 'ADVISOR' | 'PARENT'
  // ویرایش فقط وقتی مجاز است که هم خودش دانش‌آموز باشد (SELF) هم سرور گفته SELF
  const [access, setAccess] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', takenAt: '', rank: '', percentages: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  // وقتی اینترنت نیست و آخرین نمرات ذخیره‌شده نشان داده می‌شود (فقط‌خواندنی)
  const [offlineInfo, setOfflineInfo] = useState(null);
  // سریِ انتخاب‌شده‌ی نمودار: 'all' | 'rank' | کلید درصد
  // کاربر از فهرست بالای نمودار انتخاب می‌کند کدام درس را ببیند یا روند تراز را.
  const [series, setSeries] = useState(null);
  // ویرایش فقط وقتی مجاز است که خودش دانش‌آموز باشد، سرور هم SELF گفته باشد و اینترنت وصل باشد
  const editable = canEdit && access === 'SELF' && !offlineInfo;
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const data = await fetchMockExamScores(studentId);
      setScores(data.scores || []);
      setAccess(data.access || null);
      setOfflineInfo(null);
      setError('');
      // فقط نمرات خود دانش‌آموز برای خواندن بدون اینترنت نگه داشته می‌شود
      if (data.access === 'SELF') saveOfflineMockScores(studentId, data.scores || []);
    } catch (err) {
      const cached = err?.isNetworkError && canEdit ? loadOfflineMockScores(studentId) : null;
      if (cached) {
        setScores(cached.scores);
        setAccess('SELF');
        setOfflineInfo({ savedAt: cached.savedAt });
        setError('');
      } else {
        setError(err.message);
        setScores([]);
      }
    }
  }, [studentId, canEdit]);

  // به‌محض وصل‌شدن دوباره‌ی اینترنت، نمرات تازه گرفته می‌شود
  useEffect(() => {
    if (!offlineInfo) return undefined;
    const onOnline = () => load();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [offlineInfo, load]);

  useEffect(() => {
    // بارگذاری نمرات از سرور — setState داخل await انجام می‌شود (پس از پاسخ شبکه)
     
    load();
  }, [load]);

  // مجموعه‌ی خط‌های نمودار — تراز + هر کلید درصدی که در داده‌ها دیده شود
  const percentKeys = useMemo(() => {
    if (!scores) return [];
    const keys = new Set();
    for (const s of scores) {
      if (s.percentages) {
        Object.keys(s.percentages).forEach((k) => keys.add(k));
      }
    }
    return [...keys].sort();
  }, [scores]);

  // آیا اصلاً ترازی ثبت شده؟ (برای نمایش/پنهان‌کردن گزینه‌ی «روند تراز»)
  const hasRank = useMemo(() => (scores ? scores.some((s) => s.rank != null) : false), [scores]);

  // سریِ واقعیِ نمودار — به‌جای نگه‌داشتن یک حالت جداگانه، از روی انتخاب کاربر
  // و داده‌ی فعلی محاسبه می‌شود تا با حذف‌شدن یک درس، خودکار به حالت معتبر برگردد.
  //   انتخاب نشده → روند تراز (اگر باشد) وگرنه همه‌ی سری‌ها
  const activeSeries = useMemo(() => {
    if (series === 'all') return 'all';
    if (series === 'rank') return hasRank ? 'rank' : 'all';
    if (series && percentKeys.includes(series)) return series;
    return hasRank ? 'rank' : 'all';
  }, [series, percentKeys, hasRank]);

  const chartData = useMemo(() => {
    if (!scores) return [];
    return scores.map((s) => ({
      name: formatJalaliShort(new Date(s.takenAt)),
      takenAt: s.takenAt,
      title: s.title,
      ...(s.rank != null ? { 'تراز': s.rank } : {}),
      ...(s.percentages || {}),
    }));
  }, [scores]);

  const LINE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

  // --- فرم ثبت/ویرایش ---
  const resetForm = () => {
    setForm({ title: '', takenAt: '', rank: '', percentages: [] });
    setShowForm(false);
    setEditingId(null);
    setError('');
  };

  // تور راهنما می‌تواند فرم ثبت نمره را باز/بسته کند تا فیلدها را نشان بدهد
  useEffect(() => {
    if (!editable || compact) return undefined;
    const onTourForm = (e) => {
      if (e.detail?.form === 'mock-form') {
        startCreate();
        e.detail.ok = true;
      } else if (e.detail?.form === null && showForm) {
        resetForm();
      }
    };
    window.addEventListener('dz:tourform', onTourForm);
    return () => window.removeEventListener('dz:tourform', onTourForm);
  });

  function startCreate() {
    setForm({ title: '', takenAt: toLocalYmd(new Date()), rank: '', percentages: [] });
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(score) {
    setForm({
      title: score.title,
      takenAt: toLocalYmd(new Date(score.takenAt)),
      rank: score.rank != null ? String(score.rank) : '',
      percentages: Object.entries(score.percentages || {}).map(([k, v]) => ({ key: k, value: String(v) })),
    });
    setEditingId(score.id);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { setError('عنوان آزمون الزامی است'); return; }
    if (!form.takenAt) { setError('تاریخ آزمون الزامی است'); return; }
    // تراز فقط نباید منفی باشد؛ سقفی برایش تعریف نمی‌کنیم
    if (form.rank && (!Number.isInteger(Number(form.rank)) || Number(form.rank) < 0)) {
      setError('تراز باید عدد صحیح و نامنفی باشد'); return;
    }
    const percentageMap = {};
    for (const { key, value } of form.percentages) {
      if (!key.trim()) continue;
      const num = Number(toLatinDigits(value));
      if (!Number.isFinite(num) || num < 0 || num > 100) {
        setError(`درصد «${key}» باید عددی بین ۰ و ۱۰۰ باشد`); return;
      }
      percentageMap[key.trim().slice(0, 40)] = num;
    }

    const payload = {
      title: form.title.trim(),
      takenAt: ymdToIso(form.takenAt),
      ...(form.rank ? { rank: Number(form.rank) } : {}),
      ...(Object.keys(percentageMap).length > 0 ? { percentages: percentageMap } : {}),
    };

    setSaving(true);
    setError('');
    try {
      if (editingId) {
        const data = await updateMockExamScore(editingId, payload);
        toast.success(data.message || 'به‌روزرسانی شد');
      } else {
        const data = await createMockExamScore(studentId, payload);
        toast.success(data.message || 'ثبت شد');
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setSaving(true);
    try {
      await deleteMockExamScore(confirmDelete.id);
      toast.success('نتیجه حذف شد');
      setConfirmDelete(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // مدیریت ردیف‌های درصد فرم
  function addPercentRow() {
    setForm((f) => ({ ...f, percentages: [...f.percentages, { key: '', value: '' }] }));
  }
  function setPercentRow(i, patch) {
    setForm((f) => {
      const next = [...f.percentages];
      next[i] = { ...next[i], ...patch };
      return { ...f, percentages: next };
    });
  }
  function removePercentRow(i) {
    setForm((f) => ({ ...f, percentages: f.percentages.filter((_, idx) => idx !== i) }));
  }

  return (
    <div className="stat-card card mock-exams-card">
      <div className="section-head mock-head">
        <h3 className="section-title">
          <span className="section-emoji"><Ico e="📈" /></span>
          کارنامه‌ی آزمون‌های آزمایشی
        </h3>
        {editable && !compact && (
          <button type="button" className="btn-secondary btn-sm" onClick={showForm ? resetForm : startCreate}>
            {showForm ? 'بستن' : '+ نمره‌ی جدید'}
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error">
          <span><Ico e="⚠" /></span> {error}
        </div>
      )}

      {offlineInfo && (
        <div className="mock-offline-note" role="status">
          <span aria-hidden><Ico e="📌" /></span>
          اینترنت نیست؛ آخرین نمرات ذخیره‌شده نمایش داده می‌شود.
        </div>
      )}

      {!scores ? (
        <p className="muted">در حال بارگذاری…</p>
      ) : scores.length === 0 ? (
        <p className="muted">
          {editable
            ? 'هنوز نمره‌ای ثبت نشده — اولین نتیجه‌ی آزمون آزمایشی‌ات را ثبت کن تا نمودار پیشرفتت ساخته شود.'
            : 'هنوز نتیجه‌ای برای نمایش وجود ندارد.'}
        </p>
      ) : (
        <>
          {/* انتخاب سریِ نمودار: روند تراز یا وضعیت یک درس مشخص */}
          {(hasRank || percentKeys.length > 0) && (
            <div className="mock-series-picker" role="group" aria-label="انتخاب سری نمودار">
              <span className="mock-series-label"><Ico e="🔍" /> نمایش وضعیت:</span>
              <div className="mock-series-chips">
                {hasRank && (
                  <button
                    type="button"
                    className={`mock-series-chip ${activeSeries === 'rank' ? 'active' : ''}`}
                    onClick={() => setSeries('rank')}
                  >
                    روند تراز
                  </button>
                )}
                {percentKeys.map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={`mock-series-chip ${activeSeries === k ? 'active' : ''}`}
                    onClick={() => setSeries(k)}
                  >
                    {labelFor(k)}
                  </button>
                ))}
                <button
                  type="button"
                  className={`mock-series-chip ${activeSeries === 'all' ? 'active' : ''}`}
                  onClick={() => setSeries('all')}
                >
                  همه
                </button>
              </div>
            </div>
          )}

          {/* نمودار خطی روند پیشرفت/پسرفت */}
          <div className={`mock-chart-wrap ${compact ? 'is-compact' : ''}`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fontFamily: 'inherit' }}
                  reversed
                />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} />
                <Tooltip
                  contentStyle={{ fontFamily: 'inherit', direction: 'rtl' }}
                  labelFormatter={(label, payload) => {
                    const row = payload?.[0]?.payload;
                    return row?.title ? `${label} — ${row.title}` : label;
                  }}
                  formatter={(value, name) => [toFaDigits(value), name]}
                />
                <Legend wrapperStyle={{ fontSize: 12, direction: 'rtl' }} />
                {hasRank && (activeSeries === 'rank' || activeSeries === 'all') && (
                  <Line type="monotone" dataKey="تراز" stroke={LINE_COLORS[0]} strokeWidth={2.5} dot={{ r: 4 }} />
                )}
                {percentKeys.map((k, i) =>
                  activeSeries === 'all' || activeSeries === k ? (
                    <Line
                      key={k}
                      type="monotone"
                      dataKey={k}
                      stroke={LINE_COLORS[(i + 1) % LINE_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  ) : null
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* جدول خلاصه */}
          <div className="mock-score-list">
            {scores.map((s) => (
              <div key={s.id} className="mock-score-row">
                <div className="mock-score-main">
                  <strong className="mock-score-title">{s.title}</strong>
                  <span className="mock-score-date">{formatJalaliShort(new Date(s.takenAt))}</span>
                </div>
                <div className="mock-score-chips">
                  {s.rank != null && <span className="mock-chip">{toFaDigits(s.rank)} تراز</span>}
                  {s.percentages &&
                    Object.entries(s.percentages).map(([k, v]) => (
                      <span key={k} className="mock-chip">{labelFor(k)}: {toFaDigits(v)}٪</span>
                    ))}
                </div>
                {editable && !compact && (
                  <div className="mock-score-actions">
                    <button type="button" className="btn-ghost btn-sm" onClick={() => startEdit(s)} aria-label="ویرایش">
                      <Ico e="✏" />
                    </button>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => setConfirmDelete(s)} aria-label="حذف">
                      <Ico e="🗑" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* فرم ثبت/ویرایش */}
      {editable && !compact && showForm && (
        <form className="mock-exam-form" onSubmit={handleSubmit}>
          <div className="mock-form-grid">
            <label className="field-label" data-tour="mf-title">
              عنوان آزمون
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="مثلاً آزمون ملی تجربی فروردین"
                maxLength={190}
                required
              />
            </label>
            <div className="field-label" data-tour="mf-date">
              تاریخ آزمون
              <JalaliDatePicker
                value={form.takenAt}
                onChange={(val) => setForm((f) => ({ ...f, takenAt: val }))}
              />
            </div>
            <label className="field-label" data-tour="mf-rank">
              تراز کل (اختیاری)
              <FaNumberInput
                value={form.rank}
                onChange={(val) => setForm((f) => ({ ...f, rank: val }))}
                placeholder="مثلاً ۱۴۵۰"
                dir="ltr"
              />
              <span className="field-hint">فقط نباید منفی باشد؛ سقفی برای تراز وجود ندارد.</span>
            </label>
          </div>

          {/* درصدها */}
          <div className="field-label mock-percent-block" data-tour="mf-percent">
            درصدها (اختیاری)
            {form.percentages.map((row, i) => (
              <div key={i} className="mock-percent-row">
                <input
                  type="text"
                  className="mock-percent-name"
                  value={row.key}
                  onChange={(e) => setPercentRow(i, { key: e.target.value })}
                  placeholder="نام — مثلاً عمومی / اختصاصی / زیست"
                  maxLength={40}
                />
                <FaNumberInput
                  className="mock-percent-value"
                  value={row.value}
                  onChange={(val) => setPercentRow(i, { value: val })}
                  placeholder="درصد"
                  dir="ltr"
                />
                <button
                  type="button"
                  className="btn-ghost btn-sm mock-percent-remove"
                  onClick={() => removePercentRow(i)}
                  aria-label="حذف این درصد"
                >
                  ×
                </button>
              </div>
            ))}
            <button type="button" className="btn-secondary btn-sm" onClick={addPercentRow}>
              + افزودن درصد
            </button>
          </div>

          <div className="mock-form-actions" data-tour="mf-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'در حال ذخیره…' : editingId ? 'ذخیره‌ی تغییرات' : 'ثبت نمره'}
            </button>
            <button type="button" className="btn-secondary" onClick={resetForm}>انصراف</button>
          </div>
        </form>
      )}

      {/* حذف نمره */}
      {confirmDelete && (
        <ConfirmModal
          message={`نتیجه‌ی «${confirmDelete.title}» حذف شود؟`}
          confirmText="بله، حذف کن"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
