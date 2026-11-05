import { useState, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TimeInput from '../TimeInput';
import { TimeBadge } from '../PlanBits';
import { topicLabel } from '../../utils/planItem';

export default function SortableItem({
  item,
  dayOfWeek: _dayOfWeek,
  index,
  onUpdate,
  onRemove,
  tags,
  collapsed,
  onCollapse,
  onExpand,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.localId,
  });
  const [hint, setHint] = useState('');

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 100 : 1,
  };

  function updateField(patch) {
    onUpdate(index, patch);
  }

  const endTimeRef = useRef(null);

  function toggleTag(tagId) {
    const has = item.tags.includes(tagId);
    updateField({ tags: has ? item.tags.filter((t) => t !== tagId) : [...item.tags, tagId] });
  }

  function handleDone() {
    if (!item.subject.trim()) {
      setHint('اول نام درس را بنویس');
      return;
    }
    if (item.startTime && item.endTime && item.startTime > item.endTime) {
      setHint('ساعت شروع باید قبل از ساعت پایان باشد');
      return;
    }
    setHint('');
    onCollapse(item.localId);
  }

  // حالت بسته: خلاصه‌ی بازه (مشابه نمایش دانش‌آموز)
  if (collapsed) {
    const tagNames = item.tags.map((id) => tags.find((t) => t.id === id)?.name).filter(Boolean);
    return (
      <div className="builder-item is-collapsed" ref={setNodeRef} style={style}>
        <button
          type="button"
          className="drag-handle"
          aria-label="برای جابه‌جایی بکشید"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <button
          type="button"
          className="item-summary"
          onClick={() => onExpand(item.localId)}
          aria-label={`ویرایش بازه‌ی ${item.subject}`}
        >
          <span className="task-content">
            <strong>{item.subject}</strong>
            {topicLabel(item) && <span className="task-topic">{topicLabel(item)}</span>}
            {item.description && <span className="task-desc">{item.description}</span>}
            <span className="task-meta">
              <TimeBadge startTime={item.startTime} endTime={item.endTime} />
              {tagNames.map((n) => (
                <span className="tag-pill" key={n}>{n}</span>
              ))}
            </span>
          </span>
          <i className="ti ti-pencil item-summary-edit" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="danger icon-btn"
          onClick={() => onRemove(index)}
          aria-label="حذف"
        >
          ×
        </button>
      </div>
    );
  }

  // حالت باز: فرم کامل ویرایش بازه
  return (
    <div className="builder-item" ref={setNodeRef} style={style} data-tour="pb-item">
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
        <span className="item-head-title">بازه‌ی درسی</span>
        <button
          type="button"
          className="danger icon-btn"
          onClick={() => onRemove(index)}
          aria-label="حذف"
        >
          ×
        </button>
      </div>

      <div className="item-topic-row">
        <label className="item-topic-field">
          <span>نام درس</span>
          <input
            type="text"
            value={item.subject}
            onChange={(e) => updateField({ subject: e.target.value })}
            placeholder="مثلاً ریاضی"
            maxLength={100}
            required
          />
        </label>
        <label className="item-topic-field">
          <span>فصل</span>
          <input
            type="text"
            value={item.chapter || ''}
            onChange={(e) => updateField({ chapter: e.target.value })}
            placeholder="مثلاً فصل ۳: تابع"
            maxLength={191}
          />
        </label>
        <label className="item-topic-field">
          <span>بخش</span>
          <input
            type="text"
            value={item.section || ''}
            onChange={(e) => updateField({ section: e.target.value })}
            placeholder="مثلاً بخش ۲: حد"
            maxLength={191}
          />
        </label>
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
          <TimeInput
            value={item.startTime}
            onChange={(v) => updateField({ startTime: v })}
            onComplete={() => endTimeRef.current?.focus()}
          />
        </label>
        <span className="time-arrow" aria-hidden>←</span>
        <label>
          ساعت پایان
          <TimeInput
            ref={endTimeRef}
            value={item.endTime}
            onChange={(v) => updateField({ endTime: v })}
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

      <div className="item-done-row">
        {hint && <span className="item-hint" role="alert">{hint}</span>}
        <button type="button" className="btn-secondary btn-sm item-done-btn" onClick={handleDone}>
          <i className="ti ti-check" aria-hidden="true" /> ثبت بازه
        </button>
      </div>
    </div>
  );
}

