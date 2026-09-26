import { useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPlan, updatePlan, fetchTags, createTag } from '../api/client';
import { DAY_NAMES } from '../utils/dayNames';
import { formatJalaliShort } from '../utils/jalali';
import JalaliDatePicker from './JalaliDatePicker';

// یک آیتم خالی برای فرم
function makeBlankItem() {
  return { id: null, subject: '', description: '', startTime: '', endTime: '', tags: [] };
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
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ----- یک آیتم قابل کشیدن -----
function SortableItem({ item, dayOfWeek, index, onUpdate, onRemove, tags }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.localId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 100 : 1,
  };

  function updateField(patch) {
    onUpdate(index, patch);
  }

  function toggleTag(tagId) {
    const has = item.tags.includes(tagId);
    updateField({ tags: has ? item.tags.filter((t) => t !== tagId) : [...item.tags, tagId] });
  }

  return (
    <div className="builder-item" ref={setNodeRef} style={style}>
      <div className="item-head">
        <button
          type="button"
          className="drag-handle"
          aria-label="برای جابه‌جایی بکشید"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <input
          type="text"
          value={item.subject}
          onChange={(e) => updateField({ subject: e.target.value })}
          placeholder="مثلاً ریاضی، فصل ۳"
          required
        />
        <button
          type="button"
          className="danger icon-btn"
          onClick={() => onRemove(index)}
          aria-label="حذف"
        >
          ×
        </button>
      </div>

      <input
        type="text"
        value={item.description}
        onChange={(e) => updateField({ description: e.target.value })}
        placeholder="توضیح کوتاه (اختیاری)"
      />

      <div className="time-row">
        <label>
          ساعت شروع
          <input
            type="time"
            value={item.startTime}
            onChange={(e) => updateField({ startTime: e.target.value })}
          />
        </label>
        <span className="time-arrow">→</span>
        <label>
          ساعت پایان
          <input
            type="time"
            value={item.endTime}
            onChange={(e) => updateField({ endTime: e.target.value })}
          />
        </label>
      </div>

      {tags.length > 0 && (
        <div className="item-tags">
          {tags.map((t) => {
            const on = item.tags.includes(t.id);
            return (
              <button
                type="button"
                key={t.id}
                className={`tag-pill selectable ${on ? 'on' : ''}`}
                onClick={() => toggleTag(t.id)}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ----- کامپوننت اصلی PlanBuilder -----
export default function PlanBuilder({ studentId, existingPlan, onSaved, onCancel }) {
  const [form, setForm] = useState(() => {
    const f = existingPlan ? planToForm(existingPlan) : makeBlankForm();
    // اضافه‌کردن شناسه‌ی محلی (localId) برای استفاده در dnd-kit
    return {
      ...f,
      days: f.days.map((d) => ({
        ...d,
        items: d.items.map((it, idx) => ({ ...it, localId: `item-${d.dayOfWeek}-${idx}-${Math.random().toString(36).slice(2, 8)}` })),
      })),
    };
  });
  const [tags, setTags] = useState([]);
  const [newTagName, setNewTagName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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

  function toggleDay(dayOfWeek) {
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

  function handleDragEnd(dayOfWeek, event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setForm((f) => ({
      ...f,
      days: f.days.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        const oldIndex = d.items.findIndex((it) => it.localId === active.id);
        const newIndex = d.items.findIndex((it) => it.localId === over.id);
        if (oldIndex === -1 || newIndex === -1) return d;
        return { ...d, items: arrayMove(d.items, oldIndex, newIndex) };
      }),
    }));
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

  function validate() {
    if (!form.title.trim()) return 'عنوان برنامه را وارد کن';
    if (!form.startsAt) return 'تاریخ شروع را انتخاب کن';
    if (form.expiresAt && form.expiresAt < form.startsAt) {
      return 'تاریخ پایان باید بعد از تاریخ شروع باشد';
    }
    const enabledDays = form.days.filter((d) => d.enabled);
    if (enabledDays.length === 0) return 'حداقل یک روز را فعال کن';
    for (const d of enabledDays) {
      if (d.items.length === 0) return `برای ${DAY_NAMES[d.dayOfWeek]} حداقل یک درس وارد کن`;
      for (const it of d.items) {
        if (!it.subject.trim()) return 'موضوع همه‌ی آیتم‌ها را پر کن';
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
          // اگر شروع بعد از پایان بود (بازه‌ی شبانه)، به همان ترتیب مقایسه می‌شود؛ خطای ترتیب بالاتر گرفته شده
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
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const v = validate();
    if (v) { setError(v); return; }

    setSaving(true);
    try {
      const payload = {
        studentId,
        title: form.title.trim(),
        note: form.note.trim() || null,
        startsAt: new Date(form.startsAt).toISOString(),
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        days: form.days
          .filter((d) => d.enabled)
          .map((d) => ({
            dayOfWeek: d.dayOfWeek,
            items: d.items.map((it, idx) => ({
              id: it.id,
              subject: it.subject.trim(),
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
        <h3>{existingPlan ? '✎ ویرایش برنامه' : '✨ ساخت برنامه‌ی جدید'}</h3>
        <p className="muted-text">برای جابه‌جایی آیتم‌ها در یک روز، دکمه‌ی ⠿ را بکش.</p>
      </div>

      <div className="builder-row">
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

      <label className="builder-field">
        <span>توضیح کلی (اختیاری)</span>
        <textarea
          rows={2}
          value={form.note}
          onChange={(e) => updateField('note', e.target.value)}
          placeholder="یادداشت کلی برای دانش‌آموز…"
        />
      </label>

      <div className="builder-tags">
        <details>
          <summary>تگ‌های درسی ({toFaDigitsLocal(tags.length)})</summary>
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

      <div className="days-grid">
        {form.days.map((d) => (
          <div key={d.dayOfWeek} className={`builder-day ${d.enabled ? 'is-on' : ''}`}>
            <label className="day-toggle">
              <input
                type="checkbox"
                checked={d.enabled}
                onChange={() => toggleDay(d.dayOfWeek)}
              />
              <strong>{DAY_NAMES[d.dayOfWeek]}</strong>
            </label>

            {d.enabled && (
              <div className="day-items">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(e) => handleDragEnd(d.dayOfWeek, e)}
                >
                  <SortableContext
                    items={d.items.map((it) => it.localId)}
                    strategy={verticalListSortingStrategy}
                  >
                    {d.items.map((it, idx) => (
                      <SortableItem
                        key={it.localId}
                        item={it}
                        index={idx}
                        dayOfWeek={d.dayOfWeek}
                        tags={tags}
                        onUpdate={(i, patch) => updateItem(d.dayOfWeek, i, patch)}
                        onRemove={(i) => removeItem(d.dayOfWeek, i)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
                <button type="button" className="btn-secondary add-item-btn" onClick={() => addItem(d.dayOfWeek)}>
                  + افزودن درس به این روز
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="alert alert-error">
          <span>⚠</span> {error}
        </div>
      )}

      <div className="builder-actions">
        <button type="submit" disabled={saving}>
          {saving ? 'در حال ذخیره…' : existingPlan ? 'ذخیره‌ی تغییرات' : 'ساخت برنامه'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          انصراف
        </button>
      </div>
    </form>
  );
}

// تابع کمکی برای نمایش اعداد فارسی در داخل PlanBuilder
function toFaDigitsLocal(n) {
  const FA = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(n).replace(/[0-9]/g, (d) => FA[Number(d)]);
}
