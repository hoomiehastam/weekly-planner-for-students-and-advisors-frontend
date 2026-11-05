import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Ico from './Ico';
import { toFaDigits } from '../utils/jalali';

// منوی همبرگری پنل‌ها: دکمه‌ی سه‌خطی در هدر + کشوی کناری با فهرست بخش‌ها.
// هر بخش یک «صفحه‌ی» جدا است؛ با انتخاب هر مورد فقط همان بخش نمایش داده می‌شود.
// props:
//   items: [{ key, label, icon, badge?, disabled?, hint?, divider? }]
//   hint: توضیح یک‌خطی زیر نام آیتم (برای آیتم غیرفعال، پیام «اول دانش‌آموز انتخاب کن» جایگزین می‌شود)
//   active: کلید بخش فعال
//   onSelect(key, item)
//   title: عنوان بالای کشو (مثلاً «پنل مشاور»)
//   footer: محتوای پایین کشو (نود React یا تابعی که close را می‌گیرد) — برای دکمه‌های حساب کاربری در موبایل
export default function PanelMenu({ items = [], active, onSelect, title = 'منو', footer = null }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const firstRef = useRef(null);

  // تور راهنما می‌تواند کشو را باز/بسته کند تا آیتم‌های منو را نشان بدهد
  // (window.dispatchEvent(new CustomEvent('dz:panelmenu', { detail: { open: true } })))
  useEffect(() => {
    const onTour = (e) => setOpen(!!e.detail?.open);
    window.addEventListener('dz:panelmenu', onTour);
    return () => window.removeEventListener('dz:panelmenu', onTour);
  }, []);

  // بستن با Escape + قفل اسکرول صفحه‌ی پشت کشو
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    firstRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  function close() {
    setOpen(false);
    btnRef.current?.focus();
  }

  function pick(item) {
    if (item.disabled) return;
    setOpen(false);
    onSelect?.(item.key, item);
  }

  if (items.length === 0 && !footer) return null;
  const activeItem = items.find((i) => i.key === active);
  const totalBadge = items.reduce((n, i) => n + (i.key !== active && i.badge > 0 ? i.badge : 0), 0);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        data-tour="menu-btn"
        className={`hamburger-btn ${items.length === 0 ? 'only-mobile' : ''}`}
        aria-label="باز کردن منوی بخش‌ها"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="hamburger-lines" aria-hidden="true">
          <span /><span /><span />
        </span>
        {activeItem && <span className="hamburger-current">{activeItem.label}</span>}
        {totalBadge > 0 && <span className="hamburger-dot" aria-hidden="true" />}
      </button>

      {open && createPortal(
        <div className="panel-drawer-overlay" onClick={close}>
          <aside
            className="panel-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-drawer-head">
              <strong>{title}</strong>
              <button type="button" className="panel-drawer-close" onClick={close} aria-label="بستن منو">
                <Ico e="✕" />
              </button>
            </div>
            <nav className="panel-drawer-list" aria-label={title}>
              {items.map((item, idx) => (
                <div key={item.key}>
                  {item.divider && <div className="panel-drawer-divider" role="separator" />}
                  <button
                    ref={idx === 0 ? firstRef : null}
                    type="button"
                    data-tour-item={item.key}
                    className={`panel-drawer-item ${active === item.key ? 'active' : ''}`}
                    disabled={item.disabled}
                    aria-current={active === item.key ? 'page' : undefined}
                    onClick={() => pick(item)}
                  >
                    <span className="panel-drawer-icon" aria-hidden="true">
                      {typeof item.icon === 'string' ? <Ico e={item.icon} /> : item.icon}
                    </span>
                    <span className="panel-drawer-label">
                      {item.label}
                      {item.hint && <small>{item.hint}</small>}
                    </span>
                    {item.badge > 0 && <span className="panel-drawer-badge">{toFaDigits(item.badge)}</span>}
                  </button>
                </div>
              ))}
            </nav>
            {footer && (
              <div className="panel-drawer-footer">
                {typeof footer === 'function' ? footer(() => setOpen(false)) : footer}
              </div>
            )}
          </aside>
        </div>,
        document.body
      )}
    </>
  );
}
