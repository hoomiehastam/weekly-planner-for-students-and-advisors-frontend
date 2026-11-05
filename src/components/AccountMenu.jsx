import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Ico from './Ico';

// منوی کوچک «حساب من» (فقط موبایل): پروفایل، واریز، راهنما، نصب برنامه و خروج.
// جدا از منوی همبرگریِ بخش‌ها است تا «کجا بروم» و «حساب من» با هم قاطی نشوند.
// props:
//   items: [{ key, label, icon, onClick, danger? }]
//   extra: محتوای دلخواه بالای فهرست (مثل دکمه‌ی نصب)
export default function AccountMenu({ items = [], extra = null, avatar = null }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);

  // تور راهنما می‌تواند این منو را باز/بسته کند تا موارد داخلش را توضیح بدهد
  useEffect(() => {
    const onTour = (e) => setOpen(!!e.detail?.open);
    window.addEventListener('dz:accountmenu', onTour);
    return () => window.removeEventListener('dz:accountmenu', onTour);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function close() {
    setOpen(false);
    btnRef.current?.focus();
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="account-menu-btn"
        data-tour="account-btn"
        aria-label="منوی حساب کاربری"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {avatar || <i className="ti ti-user" aria-hidden="true" />}
      </button>
      {open && createPortal(
        <div className="account-menu-overlay" onClick={close}>
          <div className="account-menu" role="menu" data-tour="account-menu" onClick={(e) => e.stopPropagation()}>
            {extra && <div className="account-menu-extra">{extra}</div>}
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                className={`account-menu-item ${item.danger ? 'is-danger' : ''}`}
                onClick={() => { setOpen(false); item.onClick?.(); }}
              >
                <span className="account-menu-icon" aria-hidden="true">
                  {typeof item.icon === 'string' ? <Ico e={item.icon} /> : item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
