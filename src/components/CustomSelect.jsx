import { useState, useRef, useEffect } from 'react';

/**
 * دراپ‌داون اختصاصی هماهنگ با دیزاین سیستم نرم‌افزار
 * جایگزین select پیش‌فرض سیستم‌عامل
 */
export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'انتخاب کنید',
  className = '',
  id,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // بستن منو با کلیک به بیرون
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // بستن با Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  return (
    <div
      ref={containerRef}
      className={`custom-select-wrap ${open ? 'is-open' : ''} ${className}`.trim()}
      id={id}
    >
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`custom-select-label ${!selectedOption && !value ? 'is-placeholder' : ''}`}>
          {displayLabel}
        </span>
        <i
          className={`ti ti-chevron-${open ? 'up' : 'down'} custom-select-chevron`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul className="custom-select-dropdown" role="listbox">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li
                key={String(opt.value)}
                role="option"
                aria-selected={isSelected}
                className={`custom-select-option ${isSelected ? 'is-selected' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <i className="ti ti-check custom-select-check" aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

