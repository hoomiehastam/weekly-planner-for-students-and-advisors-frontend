import { useEffect, useState } from 'react';

// نوار ناوبری پایین (فقط موبایل) — دسترسی سریع با انگشت شست به بخش‌های کلیدی صفحه.
// props:
//   items: [{ key, label, icon, target? }]  target -> id بخش برای highlight هنگام اسکرول
//   onSelect?(key, item): اقدام دلخواه هنگام انتخاب (مثل scroll به بخش یا تعویض تب)
export default function MobileNav({ items, onSelect }) {
  const [activeKey, setActiveKey] = useState(items[0]?.key ?? null);

  function handleClick(item) {
    setActiveKey(item.key);
    if (onSelect) onSelect(item.key, item);
  }

  useEffect(() => {
    let io = null;
    let mo = null;
    let timer = null;

    function observeAll() {
      const observed = items
        .filter((i) => i.target)
        .map((i) => ({ el: document.getElementById(i.target), key: i.key }))
        .filter((t) => t.el);

      if (io) {
        io.disconnect();
        io = null;
      }
      if (observed.length === 0) return;

      io = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          if (visible.length > 0) {
            const found = observed.find((t) => t.el === visible[0].target);
            if (found) setActiveKey(found.key);
          }
        },
        { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
      );
      observed.forEach((t) => io.observe(t.el));

      // اگر هنوز همه‌ی بخش‌ها در DOM نیستند (مثلاً قبل از انتخاب دانش‌آموز)،
      // با تغییر DOM دوباره بررسی می‌کنیم.
      const expected = items.filter((i) => i.target).length;
      if (observed.length < expected) {
        if (!mo) {
          mo = new MutationObserver(() => {
            clearTimeout(timer);
            timer = setTimeout(observeAll, 250);
          });
          mo.observe(document.body, { childList: true, subtree: true });
        }
      } else if (mo) {
        mo.disconnect();
        mo = null;
      }
    }

    observeAll();
    return () => {
      if (io) io.disconnect();
      if (mo) mo.disconnect();
      clearTimeout(timer);
    };
  }, [items]);

  return (
    <nav className="mobile-nav" aria-label="ناوبری سریع">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`mobile-nav-item ${activeKey === item.key ? 'active' : ''}`}
          onClick={() => handleClick(item)}
        >
          <span className="mobile-nav-icon" aria-hidden>
            {item.icon}
          </span>
          <span className="mobile-nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}