import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

// بخش فعال یک پنل را در آدرس صفحه (?s=کلید) نگه می‌دارد:
// با رفرش همان بخش باز می‌ماند و دکمه‌ی «بازگشت» مرورگر بین بخش‌ها کار می‌کند.
// keys: کلیدهای مجاز؛ اگر آدرس کلید نامعتبری داشت، بخش پیش‌فرض (اولین کلید) باز می‌شود.
export default function usePanelSection(keys, fallback = keys[0]) {
  const [params, setParams] = useSearchParams();
  const raw = params.get('s');
  const section = raw && keys.includes(raw) ? raw : fallback;

  const setSection = useCallback(
    (next) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === fallback) p.delete('s');
          else p.set('s', next);
          return p;
        },
        { replace: false }
      );
      window.scrollTo({ top: 0, behavior: 'auto' });
    },
    [setParams, fallback]
  );

  return [section, setSection];
}
