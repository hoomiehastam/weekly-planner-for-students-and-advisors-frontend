import { useState } from 'react';
import { setItemTagLog } from '../api/client';
import FaNumberInput from './FaNumberInput';
import { toFaDigits } from '../utils/jalali';

// کامپوننت ورودی‌های per-tag برای یک آیتم درسی.
// درون هر task-row نمایش داده می‌شود و به دانش‌آموز اجازه می‌دهد برای هر تگ
// (یا «سایر» کارهای این درس) دقیقه و تست ثبت کند.
// نسخه‌ی ۸: فیلد «تست» برای همه‌ی تگ‌ها نمایش داده می‌شود (نه فقط تمرین) و
// ذخیره با دکمه‌ی «ثبت» انجام می‌شود — نه blur — تا مقادیر نیمه‌کاره از دست نروند.
//
// props:
//   item: آیتم درسی (شامل tags و itemLogs)
//   onChange: callback اختیاری هنگام به‌روزرسانی موفق

// ساخت map از لاگ‌های سرور برای فرم: { [tagId|'other']: { minutes, tests, note } }
function buildLogsMap(itemLogs) {
  const next = {};
  for (const log of itemLogs || []) {
    const key = log.tagId || 'other';
    next[key] = {
      minutes: log.minutes ? String(log.minutes) : '',
      tests: log.testsTaken !== null && log.testsTaken !== undefined ? String(log.testsTaken) : '',
      note: log.note || '',
    };
  }
  return next;
}

export default function PerTagInputs({ item, onChange }) {
  const [logs, setLogs] = useState(() => buildLogsMap(item.itemLogs));
  const [savingKey, setSavingKey] = useState(null); // tagId که در حال ذخیره است
  const [savedKey, setSavedKey] = useState(null); // آخرین ردیف ذخیره‌شده — برای بازخورد ✓
  const [error, setError] = useState('');

  // همگام‌سازی با itemLogs از سرور وقتی مرجع آرایه تغییر کرد (ست‌استیت هنگام render)
  const [prevItemLogs, setPrevItemLogs] = useState(item.itemLogs);
  if (item.itemLogs !== prevItemLogs) {
    setPrevItemLogs(item.itemLogs);
    setLogs(buildLogsMap(item.itemLogs));
  }

  function updateInput(key, field, value) {
    setLogs((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { minutes: '', tests: '', note: '' }),
        [field]: value,
      },
    }));
  }

  // ذخیره‌ی یک ردیف خاص (tagId یا 'other') با دکمه‌ی ثبت
  async function saveLog(key, tagId) {
    const input = logs[key];
    if (!input) return;

    // اگر هیچ فیلدی پر نشده، کاری نکن — از پاک‌شدن تصادفی جلوگیری می‌شود
    const mins = input.minutes === '' ? null : parseInt(input.minutes, 10);
    const tests = input.tests === '' ? null : parseInt(input.tests, 10);
    const note = input.note?.trim() || null;

    if (mins === null && tests === null && !note) {
      setError('');
      return;
    }
    if (mins !== null && (Number.isNaN(mins) || mins < 0 || mins > 1440)) {
      setError('دقیقه باید عددی بین ۰ و ۱۴۴۰ باشد');
      return;
    }
    if (tests !== null && (Number.isNaN(tests) || tests < 0)) {
      setError('تعداد تست باید عدد معتبر باشد');
      return;
    }

    setSavingKey(key);
    setError('');
    try {
      const data = await setItemTagLog(item.id, {
        tagId: tagId || null,
        minutes: mins ?? 0,
        testsTaken: tests,
        note,
      });
      if (data.log === null) {
        // حذف شده (همه‌ی فیلدها صفر شده بودند)
        setLogs((prev) => {
          const next = { ...prev };
          next[key] = { minutes: '', tests: '', note: '' };
          return next;
        });
      } else {
        // نرمال‌سازی با مقدار سرور
        setLogs((prev) => ({
          ...prev,
          [key]: {
            minutes: data.log.minutes ? String(data.log.minutes) : '',
            tests: data.log.testsTaken !== null && data.log.testsTaken !== undefined ? String(data.log.testsTaken) : '',
            note: data.log.note || '',
          },
        }));
      }
      setSavedKey(key);
      setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 1800);
      if (onChange) onChange(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingKey(null);
    }
  }

  // اگر آیتم هیچ تگی ندارد، فقط یک ردیف «سایر» نشان بده
  const tags = item.tags || [];

  return (
    <div className="per-tag-inputs">
      <div className="per-tag-label">
        📝 ثبت زمان و تست برای این درس
      </div>
      <div className="per-tag-rows">
        {tags.map(({ tag }) => {
          const key = tag.id;
          const input = logs[key] || { minutes: '', tests: '', note: '' };
          return (
            <div className="per-tag-row" key={tag.id}>
              <span className="per-tag-name">{tag.name}</span>
              <div className="per-tag-fields">
                <label className="per-tag-field">
                  <span>⏱ دقیقه</span>
                  <FaNumberInput
                    value={input.minutes}
                    onChange={(v) => updateInput(key, 'minutes', v)}
                    placeholder="۰"
                    disabled={savingKey === key}
                  />
                </label>
                <label className="per-tag-field">
                  <span>✎ تست</span>
                  <FaNumberInput
                    value={input.tests}
                    onChange={(v) => updateInput(key, 'tests', v)}
                    placeholder="۰"
                    disabled={savingKey === key}
                  />
                </label>
                <button
                  type="button"
                  className={`per-tag-save-btn ${savedKey === key ? 'is-saved' : ''}`}
                  onClick={() => saveLog(key, tag.id)}
                  disabled={savingKey === key}
                  title="ثبت زمان و تست این تگ"
                >
                  {savingKey === key ? '…' : savedKey === key ? '✓ ثبت شد' : 'ثبت'}
                </button>
              </div>
            </div>
          );
        })}

        {/* ردیف «سایر کارها» برای این درس */}
        <div className="per-tag-row per-tag-other" key="other">
          <span className="per-tag-name">📌 سایر</span>
          <div className="per-tag-fields">
            <label className="per-tag-field">
              <span>⏱ دقیقه</span>
              <FaNumberInput
                value={(logs.other || {}).minutes || ''}
                onChange={(v) => updateInput('other', 'minutes', v)}
                placeholder="۰"
                disabled={savingKey === 'other'}
              />
            </label>
            <label className="per-tag-field">
              <span>✎ تست</span>
              <FaNumberInput
                value={(logs.other || {}).tests || ''}
                onChange={(v) => updateInput('other', 'tests', v)}
                placeholder="۰"
                disabled={savingKey === 'other'}
              />
            </label>
            <label className="per-tag-field per-tag-field-note">
              <span>✎ توضیح</span>
              <input
                type="text"
                value={(logs.other || {}).note || ''}
                onChange={(e) => updateInput('other', 'note', e.target.value)}
                placeholder="چه کاری کردی؟"
                maxLength={120}
                disabled={savingKey === 'other'}
              />
            </label>
            <button
              type="button"
              className={`per-tag-save-btn ${savedKey === 'other' ? 'is-saved' : ''}`}
              onClick={() => saveLog('other', null)}
              disabled={savingKey === 'other'}
              title="ثبت سایر کارهای این درس"
            >
              {savingKey === 'other' ? '…' : savedKey === 'other' ? '✓ ثبت شد' : 'ثبت'}
            </button>
          </div>
        </div>
      </div>

      {/* خلاصه‌ی ثبت‌شده‌ها برای این درس */}
      {(item.itemLogs || []).length > 0 && (
        <div className="per-tag-summary">
          {(item.itemLogs || []).map((log) => (
            <span key={log.id} className="per-tag-summary-chip">
              {log.tag ? log.tag.name : '📌 سایر'}
              {log.minutes ? ` · ${toFaDigits(log.minutes)} دقیقه` : ''}
              {log.testsTaken ? ` · ${toFaDigits(log.testsTaken)} تست` : ''}
            </span>
          ))}
        </div>
      )}

      {error && <p className="per-tag-error">⚠ {error}</p>}
    </div>
  );
}
