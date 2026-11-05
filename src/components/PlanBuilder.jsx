import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { createPlan, updatePlan, fetchTags, createTag } from '../api/client';
import { DAY_NAMES } from '../utils/dayNames';
import JalaliDatePicker from './JalaliDatePicker';
import DraftNotice from './DraftNotice';
import { useAuth } from '../context/AuthContext';
import { useDraft } from '../hooks/useDraft';
import { clearDraft, draftKey, readDraft } from '../utils/drafts';
import Ico from './Ico';
import { summarizeLessons } from '../utils/planItem';
import BuilderDay from './planBuilder/BuilderDay';
import LessonSummaryTable from './planBuilder/LessonSummaryTable';

// یک آیتم خالی برای فرم
function makeBlankItem() {
  return { id: null, subject: '', chapter: '', section: '', description: '', startTime: '', endTime: '', tags: [] };
}

// تبدیل داده‌ی برنامه‌ی موجود به ساختار داخلی فرم
function planToForm(plan) {
  return {
    title: plan.title || '',
    note: plan.note || '',
    startsAt: toDateInput(plan.startsAt),
    expiresAt: plan.expiresAt ? toDateInput(plan.expiresAt) : '',
    days: DAY_NAMES.map((_, dayOfWeek) => {
      const existing = plan.days?.find((d) => d.dayOfWeek === dayOfWeek);
      if (!existing) return { dayOfWeek, enabled: false, items: [] };
      return {
        dayOfWeek,
        enabled: true,
        items: existing.items.map((it) => ({
          id: it.id,
          subject: it.subject || '',
          chapter: it.chapter || '',
          section: it.section || '',
          description: it.description || '',
          startTime: it.startTime || '',
          endTime: it.endTime || '',
          tags: (it.tags || []).map((t) => t.tag?.id || t.tagId),
        })),
      };
    }),
  };
}

function makeBlankForm() {
  return {
    title: '',
    note: '',
    startsAt: toDateInput(new Date()),
    expiresAt: '',
    days: DAY_NAMES.map((_, dayOfWeek) => ({ dayOfWeek, enabled: false, items: [] })),
  };
}

function toDateInput(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// شناسه‌ی آیتم‌هایی که موضوع‌شان پر شده است (این‌ها بعد از نوشتن بسته نمایش داده می‌شوند)
function filledItemIds(days) {
  return days.flatMap((d) => d.items.filter((it) => it.subject.trim()).map((it) => it.localId));
}

// افزودن شناسه‌ی محلی (localId) به آیتم‌ها برای استفاده در dnd-kit
function withLocalIds(f) {
  return {
    ...f,
    days: f.days.map((d) => ({
      ...d,
      items: d.items.map((it, idx) => ({
        ...it,
        chapter: it.chapter ?? '',
        section: it.section ?? '',
        localId: it.localId || `item-${d.dayOfWeek}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
      })),
    })),
  };
}

// امضای فرم برای تشخیص «تغییر کرده یا نه» (شناسه‌های محلیِ تصادفی نادیده گرفته می‌شوند)
function formSignature(form) {
  return JSON.stringify({
    ...form,
    days: form.days.map((d) => ({
      ...d,
      items: d.items.map(({ localId: _localId, ...rest }) => rest),
    })),
  });
}

// پیش‌نویس خراب یا قدیمی نباید برنامه را از کار بیندازد
function isValidFormShape(f) {
  return !!f && typeof f.title === 'string' && Array.isArray(f.days) && f.days.length === 7
    && f.days.every((d) => d && Array.isArray(d.items));
}

// تبدیل اعداد انگلیسی به فارسی
function toFaDigits(n) {
  const FA = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(n).replace(/[0-9]/g, (d) => FA[Number(d)]);
}

// ----- کامپوننت اصلی PlanBuilder -----
export default function PlanBuilder({ studentId, existingPlan, onSaved, onCancel }) {
  const { auth } = useAuth();
  const userId = auth?.user?.id;

  // ----- پیش‌نویس خودکار: با رفرش یا بسته‌شدن صفحه، نوشته‌ها از بین نمی‌روند -----
  const scope = `plan:${studentId}:${existingPlan ? existingPlan.id : 'new'}`;
  const key = userId ? draftKey(userId, scope) : null;
  const planStamp = existingPlan?.updatedAt || null;

  const [baseForm] = useState(() => withLocalIds(existingPlan ? planToForm(existingPlan) : makeBlankForm()));
  const [baseSig] = useState(() => formSignature(baseForm));
  const [saved] = useState(() => {
    const d = key ? readDraft(key) : null;
    return d && isValidFormShape(d.data) ? d : null;
  });
  // اگر برنامه بعد از ذخیره‌ی پیش‌نویس روی سرور عوض شده باشد، بی‌صدا جایگزینش نمی‌کنیم
  const conflict = !!saved && !!existingPlan && (saved.meta?.planStamp ?? null) !== planStamp;
  const [notice, setNotice] = useState(saved ? (conflict ? 'conflict' : 'restored') : null);
  const [form, setForm] = useState(() => (saved && !conflict ? withLocalIds(saved.data) : baseForm));
  const [tags, setTags] = useState([]);
  const [newTagName, setNewTagName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // روزی که الان باز است (فقط یکی؛ بقیه‌ی روزها خلاصه نشان داده می‌شوند). برنامه‌ی موجود: همه بسته
  const [openDay, setOpenDay] = useState(null);
  // بازه‌هایی که بسته (خلاصه) نمایش داده می‌شوند؛ بازه‌ی تازه و ناقص همیشه باز می‌ماند
  const [collapsedItems, setCollapsedItems] = useState(() => new Set(filledItemIds(form.days)));

  const dirty = useMemo(() => formSignature(form) !== baseSig, [form, baseSig]);
  // خلاصه‌ی «هر درس چند بازه دارد» — پایین فرم، قبل از ثبت
  const lessonSummary = useMemo(() => summarizeLessons(form.days), [form.days]);
  const totalSlots = lessonSummary.reduce((n, l) => n + l.count, 0);
  const { discard } = useDraft({
    key,
    data: form,
    meta: { planStamp },
    dirty,
    enabled: notice !== 'conflict',
  });

  function handleResetDraft() {
    setForm(baseForm);
    setCollapsedItems(new Set(filledItemIds(baseForm.days)));
    setOpenDay(null);
    setNotice(null);
  }
  function handleRestoreConflict() {
    const restored = withLocalIds(saved.data);
    setForm(restored);
    setCollapsedItems(new Set(filledItemIds(restored.days)));
    setOpenDay(null);
    setNotice('restored');
  }
  function handleDeleteConflict() {
    if (key) clearDraft(key);
    setNotice(null);
  }
  function handleCancel() {
    discard();
    onCancel();
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchTags()
      .then((data) => setTags(data.tags))
      .catch((err) => setError(err.message));
  }, []);

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // بستن بازه‌های پرشده‌ی یک روز (وقتی از آن روز می‌رویم)
  function collapseFilledInDay(dayOfWeek) {
    const day = form.days.find((d) => d.dayOfWeek === dayOfWeek);
    if (!day) return;
    setCollapsedItems((prev) => {
      const next = new Set(prev);
      day.items.forEach((it) => { if (it.subject.trim()) next.add(it.localId); });
      return next;
    });
  }

  // باز کردن یک روز؛ روز قبلی خودکار به حالت خلاصه می‌رود
  function switchOpenDay(next) {
    if (openDay !== null && openDay !== next) collapseFilledInDay(openDay);
    setOpenDay(next);
  }

  function collapseItem(localId) {
    setCollapsedItems((prev) => new Set(prev).add(localId));
  }
  function expandItem(localId) {
    setCollapsedItems((prev) => {
      const next = new Set(prev);
      next.delete(localId);
      return next;
    });
  }

  function toggleDay(dayOfWeek) {
    const turningOn = !form.days.find((d) => d.dayOfWeek === dayOfWeek)?.enabled;
    if (turningOn) switchOpenDay(dayOfWeek);
    else if (openDay === dayOfWeek) setOpenDay(null);
    setForm((f) => ({
      ...f,
      days: f.days.map((d) =>
        d.dayOfWeek === dayOfWeek
          ? { ...d, enabled: !d.enabled, items: !d.enabled ? [{ ...makeBlankItem(), localId: `item-${dayOfWeek}-new-${Date.now()}` }] : [] }
          : d
      ),
    }));
  }

  function updateItem(dayOfWeek, itemIndex, patch) {
    setForm((f) => ({
      ...f,
      days: f.days.map((d) =>
        d.dayOfWeek !== dayOfWeek
          ? d
          : {
              ...d,
              items: d.items.map((it, idx) => (idx === itemIndex ? { ...it, ...patch } : it)),
            }
      ),
    }));
  }

  function addItem(dayOfWeek) {
    collapseFilledInDay(dayOfWeek); // بازه‌های قبلی بسته می‌شوند و فقط بازه‌ی تازه باز می‌ماند
    setForm((f) => ({
      ...f,
      days: f.days.map((d) =>
        d.dayOfWeek !== dayOfWeek
          ? d
          : { ...d, items: [...d.items, { ...makeBlankItem(), localId: `item-${dayOfWeek}-new-${Date.now()}` }] }
      ),
    }));
  }

  function removeItem(dayOfWeek, itemIndex) {
    setForm((f) => ({
      ...f,
      days: f.days.map((d) =>
        d.dayOfWeek !== dayOfWeek
          ? d
          : { ...d, items: d.items.filter((_, idx) => idx !== itemIndex) }
      ),
    }));
  }

  // جابه‌جایی یک بازه با کشیدن. اگر یکی از دو بازه ساعت دارد، از مشاور می‌پرسیم:
  //   «ساعت‌ها هم عوض شوند؟» بله ← دو بازه هم جایشان و هم ساعت‌هایشان با هم عوض می‌شود
  //                          نه   ← فقط ترتیب عوض می‌شود و هر بازه ساعت خودش را نگه می‌دارد
  const [moveAsk, setMoveAsk] = useState(null); // { dayOfWeek, activeId, overId }

  function applyMove(dayOfWeek, activeId, overId, swapTimes) {
    setForm((f) => ({
      ...f,
      days: f.days.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        const oldIndex = d.items.findIndex((it) => it.localId === activeId);
        const newIndex = d.items.findIndex((it) => it.localId === overId);
        if (oldIndex === -1 || newIndex === -1) return d;
        if (!swapTimes) return { ...d, items: arrayMove(d.items, oldIndex, newIndex) };
        // تعویض کامل: جای دو بازه و ساعت‌هایشان
        const items = [...d.items];
        const a = items[oldIndex];
        const b = items[newIndex];
        items[oldIndex] = { ...b, startTime: a.startTime, endTime: a.endTime };
        items[newIndex] = { ...a, startTime: b.startTime, endTime: b.endTime };
        return { ...d, items };
      }),
    }));
  }

  function handleDragEnd(dayOfWeek, event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const day = form.days.find((d) => d.dayOfWeek === dayOfWeek);
    const a = day?.items.find((it) => it.localId === active.id);
    const b = day?.items.find((it) => it.localId === over.id);
    if (!a || !b) return;
    const hasTime = (it) => !!(it.startTime || it.endTime);
    if (hasTime(a) || hasTime(b)) {
      setMoveAsk({ dayOfWeek, activeId: active.id, overId: over.id });
      return;
    }
    applyMove(dayOfWeek, active.id, over.id, false);
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return;
    try {
      const data = await createTag(newTagName.trim());
      setTags((t) => [...t, data.tag]);
      setNewTagName('');
    } catch (err) {
      setError(err.message);
    }
  }

  // روزی که خطای اعتبارسنجی در آن است (برای باز کردن خودکارش)
  const problemDayRef = useRef(null);

  function validate() {
    problemDayRef.current = null;
    if (!form.title.trim()) return 'عنوان برنامه را وارد کن';
    if (!form.startsAt) return 'تاریخ شروع را انتخاب کن';
    if (form.expiresAt && form.expiresAt < form.startsAt) {
      return 'تاریخ پایان باید بعد از تاریخ شروع باشد';
    }
    const enabledDays = form.days.filter((d) => d.enabled);
    if (enabledDays.length === 0) return 'حداقل یک روز را فعال کن';
    for (const d of enabledDays) {
      problemDayRef.current = d.dayOfWeek;
      if (d.items.length === 0) return `برای ${DAY_NAMES[d.dayOfWeek]} حداقل یک درس وارد کن`;
      for (const it of d.items) {
        if (!it.subject.trim()) return 'نام درس همه‌ی بازه‌ها را پر کن';
        if (it.startTime && it.endTime && it.startTime > it.endTime) {
          return `در ${DAY_NAMES[d.dayOfWeek]} ساعت شروع باید قبل از ساعت پایان باشد`;
        }
      }
      // --- همپوشانی بازه‌های ساعتی یک روز ---
      // فقط آیتم‌های زمان‌دار؛ بازه‌های بی‌زمان آزادند (مثلاً تکلیف نامشخص ساعت)
      const timed = d.items
        .filter((it) => it.startTime && it.endTime)
        .map((it) => ({
          subject: it.subject.trim() || 'بدون نام',
          start: it.startTime,
          end: it.endTime,
        }));
      timed.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
      for (let i = 1; i < timed.length; i++) {
        const prev = timed[i - 1];
        const cur = timed[i];
        if (cur.start < prev.end) {
          return `در ${DAY_NAMES[d.dayOfWeek]} بازه‌ی «${prev.subject}» (${prev.start}–${prev.end}) با «${cur.subject}» (${cur.start}–${cur.end}) همپوشانی دارد — یک نفر نمی‌تواند همزمان دو درس را بخواند`;
        }
      }
    }
    problemDayRef.current = null;
    return null;
  }

  // پیش‌نویس (ساخته‌شده از بازه‌ی امتحان‌ها): «ذخیره و انتشار» برای دانش‌آموز نمایش می‌دهد،
  // «ذخیره‌ی پیش‌نویس» همچنان پنهان نگه می‌دارد. دکمه‌ها قبل از submit مقدار این ref را می‌گذارند.
  const publishRef = useRef(false);
  const isDraftPlan = !!existingPlan?.isDraft;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const v = validate();
    if (v) {
      setError(v);
      if (problemDayRef.current !== null) switchOpenDay(problemDayRef.current);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        studentId,
        ...(isDraftPlan ? { isDraft: !publishRef.current } : {}),
        title: form.title.trim(),
        note: form.note.trim() || null,
        startsAt: form.startsAt,
        expiresAt: form.expiresAt || null,
        days: form.days
          .filter((d) => d.enabled)
          .map((d) => ({
            dayOfWeek: d.dayOfWeek,
            items: d.items.map((it, idx) => ({
              id: it.id,
              subject: it.subject.trim(),
              chapter: it.chapter?.trim() || null,
              section: it.section?.trim() || null,
              description: it.description.trim() || null,
              startTime: it.startTime || null,
              endTime: it.endTime || null,
              order: idx,
              tags: it.tags,
            })),
          })),
      };

      const data = existingPlan
        ? await updatePlan(existingPlan.id, payload)
        : await createPlan(payload);
      discard();
      onSaved(data.plan);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="plan-builder" onSubmit={handleSubmit}>
      <div className="builder-head">
        <h3>{existingPlan ? <><Ico e="✎" /> ویرایش برنامه</> : <><Ico e="✨" /> ساخت برنامه‌ی جدید</>}</h3>
        <p className="muted-text">برای جابه‌جایی آیتم‌ها در یک روز، دکمه‌ی ⠿ را بکش.</p>
      </div>

      {notice && (
        <DraftNotice
          variant={notice}
          savedAt={saved?.savedAt}
          onReset={handleResetDraft}
          onRestore={handleRestoreConflict}
          onDelete={handleDeleteConflict}
        />
      )}

      <div className="builder-row" data-tour="pb-title-row">
        <label className="builder-field">
          <span>عنوان برنامه</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="مثلاً برنامه‌ی هفته‌ی اوّل"
            required
          />
        </label>

        <div className="builder-field">
          <span>تاریخ شروع</span>
          <JalaliDatePicker
            value={form.startsAt}
            onChange={(v) => updateField('startsAt', v)}
            placeholder="انتخاب تاریخ شروع"
          />
        </div>

        <div className="builder-field">
          <span>تاریخ پایان (اختیاری)</span>
          <JalaliDatePicker
            value={form.expiresAt}
            onChange={(v) => updateField('expiresAt', v)}
            placeholder="اختیاری"
          />
        </div>
      </div>

      <label className="builder-field" data-tour="pb-note">
        <span>توضیح کلی (اختیاری)</span>
        <textarea
          rows={2}
          value={form.note}
          onChange={(e) => updateField('note', e.target.value)}
          placeholder="یادداشت کلی برای دانش‌آموز…"
        />
      </label>

      <div className="builder-tags" data-tour="pb-tags">
        <details>
          <summary>تگ‌های درسی ({toFaDigits(tags.length)})</summary>
          <div className="tag-create-row">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="مثلاً کنکور تجربی"
            />
            <button type="button" className="btn-secondary" onClick={handleCreateTag}>
              + افزودن
            </button>
          </div>
        </details>
      </div>

      <div className="days-grid" data-tour="pb-days">
        {form.days.map((d) => (
          <BuilderDay
            key={d.dayOfWeek}
            day={d}
            isOpen={d.enabled && openDay === d.dayOfWeek}
            sensors={sensors}
            tags={tags}
            collapsedItems={collapsedItems}
            onToggleDay={toggleDay}
            onSwitchOpenDay={switchOpenDay}
            onDragEnd={handleDragEnd}
            onCollapseItem={collapseItem}
            onExpandItem={expandItem}
            onUpdateItem={updateItem}
            onRemoveItem={removeItem}
            onAddItem={addItem}
          />
        ))}
      </div>

      <LessonSummaryTable lessonSummary={lessonSummary} totalSlots={totalSlots} />

      {error && (
        <div className="alert alert-error">
          <span><Ico e="⚠" /></span> {error}
        </div>
      )}

      {moveAsk && (
        <div className="modal-overlay" onClick={() => setMoveAsk(null)}>
          <div className="confirm-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-icon"><Ico e="❓" /></div>
            <p className="confirm-modal-message">
              ساعت این دو بازه هم جابه‌جا شود؟
              <br />
              <small className="muted-text">
                «بله»: جای دو بازه و ساعت‌هایشان با هم عوض می‌شود. «نه»: فقط ترتیب عوض می‌شود و هر بازه ساعت خودش را نگه می‌دارد.
              </small>
            </p>
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => { applyMove(moveAsk.dayOfWeek, moveAsk.activeId, moveAsk.overId, true); setMoveAsk(null); }}
              >
                بله، ساعت‌ها هم عوض شود
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { applyMove(moveAsk.dayOfWeek, moveAsk.activeId, moveAsk.overId, false); setMoveAsk(null); }}
              >
                نه، فقط جابه‌جا شود
              </button>
              <button type="button" className="btn-ghost" onClick={() => setMoveAsk(null)}>انصراف</button>
            </div>
          </div>
        </div>
      )}

      <div className="builder-actions" data-tour="pb-actions">
        {isDraftPlan ? (
          <>
            <button type="submit" disabled={saving} onClick={() => { publishRef.current = true; }}>
              {saving ? 'در حال ذخیره…' : 'ذخیره و انتشار برای دانش‌آموز'}
            </button>
            <button type="submit" className="btn-secondary" disabled={saving} onClick={() => { publishRef.current = false; }}>
              ذخیره‌ی پیش‌نویس
            </button>
          </>
        ) : (
          <button type="submit" disabled={saving}>
            {saving ? 'در حال ذخیره…' : existingPlan ? 'ذخیره‌ی تغییرات' : 'ساخت برنامه'}
          </button>
        )}
        <button type="button" className="btn-secondary" onClick={handleCancel}>
          انصراف
        </button>
      </div>
    </form>
  );
}
