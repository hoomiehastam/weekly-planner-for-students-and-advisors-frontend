import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DAY_NAMES } from '../../utils/dayNames';
import SortableItem from './SortableItem';

function toFaDigits(n) {
  const FA = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(n).replace(/[0-9]/g, (d) => FA[Number(d)]);
}

function slotMinutes(it) {
  if (!it.startTime || !it.endTime) return null;
  const [sh, sm] = it.startTime.split(':').map(Number);
  const [eh, em] = it.endTime.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return null;
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? diff : null;
}

function formatDuration(totalMin) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h && m) return `${toFaDigits(h)} ساعت و ${toFaDigits(m)} دقیقه`;
  if (h) return `${toFaDigits(h)} ساعت`;
  return `${toFaDigits(m)} دقیقه`;
}

export default function BuilderDay({
  day,
  isOpen,
  sensors,
  tags,
  collapsedItems,
  onToggleDay,
  onSwitchOpenDay,
  onDragEnd,
  onCollapseItem,
  onExpandItem,
  onUpdateItem,
  onRemoveItem,
  onAddItem,
}) {
  const filled = day.items.filter((it) => it.subject.trim());
  const totalMin = day.items.reduce((sum, it) => sum + (slotMinutes(it) || 0), 0);
  const names = filled.slice(0, 3).map((it) => it.subject.trim()).join('، ');

  return (
    <div className={`builder-day ${day.enabled ? 'is-on' : ''} ${day.enabled && !isOpen ? 'is-collapsed' : ''}`}>
      <div className="builder-day-head">
        <label className="day-toggle">
          <input
            type="checkbox"
            checked={day.enabled}
            onChange={() => onToggleDay(day.dayOfWeek)}
          />
          <strong>{DAY_NAMES[day.dayOfWeek]}</strong>
        </label>

        {day.enabled && (
          <button
            type="button"
            className="day-summary-btn"
            aria-expanded={isOpen}
            onClick={() => onSwitchOpenDay(isOpen ? null : day.dayOfWeek)}
          >
            {!isOpen && (
              <span className="day-summary-text">
                <span className="day-summary-count">{toFaDigits(day.items.length)} درس</span>
                {totalMin > 0 && <span className="day-summary-time">{formatDuration(totalMin)}</span>}
                {names && (
                  <span className="day-summary-names">
                    {names}{filled.length > 3 ? ' …' : ''}
                  </span>
                )}
              </span>
            )}
            <span className="chevron">
              <i className={`ti ti-chevron-${isOpen ? 'up' : 'down'}`} aria-hidden="true" />
            </span>
          </button>
        )}
      </div>

      {isOpen && (
        <div className="day-items">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => onDragEnd(day.dayOfWeek, e)}
          >
            <SortableContext
              items={day.items.map((it) => it.localId)}
              strategy={verticalListSortingStrategy}
            >
              {day.items.map((it, idx) => (
                <SortableItem
                  key={it.localId}
                  item={it}
                  index={idx}
                  dayOfWeek={day.dayOfWeek}
                  tags={tags}
                  collapsed={collapsedItems.has(it.localId)}
                  onCollapse={onCollapseItem}
                  onExpand={onExpandItem}
                  onUpdate={(i, patch) => onUpdateItem(day.dayOfWeek, i, patch)}
                  onRemove={(i) => onRemoveItem(day.dayOfWeek, i)}
                />
              ))}
            </SortableContext>
          </DndContext>
          <button
            type="button"
            className="btn-secondary add-item-btn"
            onClick={() => onAddItem(day.dayOfWeek)}
          >
            + افزودن درس به این روز
          </button>
        </div>
      )}
    </div>
  );
}

