import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePwa } from '../pwa/usePwa';
import { getPlatform } from '../pwa/pwa';
import { useToast } from '../context/ToastContext';

// راهنمای نصب دستی برای وقتی که مرورگر پنجره‌ی نصب خودکار نمی‌دهد
// (آیفون، یا وقتی کاربر پنجره‌ی نصب را یک بار بسته و مرورگر دیگر آن را نمی‌فرستد)
const HELP = {
  ios: {
    title: 'نصب روی آیفون',
    steps: [
      'صفحه را در مرورگر سافاری باز کن (در مرورگرهای داخل برنامه‌ها مثل اینستاگرام نصب ممکن نیست).',
      'دکمه‌ی اشتراک‌گذاری (مربع با فلش رو به بالا) را بزن.',
      'گزینه‌ی «افزودن به صفحه‌ی اصلی» را انتخاب کن و تأیید کن.',
    ],
  },
  android: {
    title: 'نصب روی اندروید',
    steps: [
      'منوی مرورگر (سه نقطه‌ی بالای صفحه) را باز کن.',
      'گزینه‌ی «نصب برنامه» یا «افزودن به صفحه‌ی اصلی» را بزن.',
      'تأیید کن؛ نشانه‌ی برنامه روی صفحه‌ی گوشی ساخته می‌شود.',
    ],
  },
  desktop: {
    title: 'نصب روی رایانه',
    steps: [
      'در نوار آدرس مرورگر (سمت چپ آدرس) دنبال نشانه‌ی نصب بگرد و آن را بزن.',
      'اگر نشانه را ندیدی، از منوی مرورگر گزینه‌ی «نصب دانش‌آموزینو» یا «ذخیره و اشتراک‌گذاری ← نصب» را انتخاب کن.',
    ],
  },
  firefox: {
    title: 'این مرورگر نصب را پشتیبانی نمی‌کند',
    steps: [
      'فایرفاکس روی رایانه نصب برنامه‌ی وب ندارد.',
      'سایت را با کروم یا اج باز کن و از آنجا نصب کن؛ یا روی گوشی باز کن.',
    ],
  },
};

function InstallHelpModal({ platform, onClose }) {
  const help = HELP[platform] || HELP.desktop;

  // وقتی راهنما باز است: صفحه‌ی پشتش اسکرول نشود و با Escape بسته شود
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // نکته‌ی مهم: راهنما را با پورتال مستقیم داخل body رندر می‌کنیم.
  // دکمه‌ی نصب داخل هدر لندینگ است و هدر backdrop-filter دارد؛ در بعضی مرورگرها (مثل سافاری)
  // چنین والدی «position: fixed» فرزندان را به جعبه‌ی خودش می‌بندد، نه به صفحه‌ی نمایش،
  // و پنجره‌ی راهنما بالای هدر بیرون می‌زند و نصفه دیده می‌شود.
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="confirm-modal install-help-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-help-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="install-help-title" className="install-help-title">{help.title}</h2>
        <ol className="install-help-steps">
          {help.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
        <div className="confirm-modal-actions">
          <button type="button" className="btn-primary" autoFocus onClick={onClose}>
            متوجه شدم
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// دکمه‌ی «نصب برنامه».
//  - تا وقتی برنامه نصب نشده باشد، همیشه نمایش داده می‌شود؛ با یک بار استفاده (حتی اگر کاربر
//    پنجره‌ی نصب را ببندد) ناپدید نمی‌شود، چون مرورگر هر پیشنهاد نصب را فقط یک بار می‌دهد.
//  - اگر مرورگر پنجره‌ی نصب خودکار بدهد همان باز می‌شود؛ وگرنه راهنمای نصب دستی نشان می‌دهیم.
//  - داخل برنامه‌ی نصب‌شده نمایش داده نمی‌شود.
// variant: 'header' (هدر پنل‌ها) | 'landing' (صفحه‌ی معرفی، برای همه‌ی بازدیدکننده‌ها)
export default function InstallButton({ variant = 'header' }) {
  const { installed, canPromptInstall, promptInstall } = usePwa();
  const toast = useToast();
  const [helpOpen, setHelpOpen] = useState(false);

  if (installed) return null;

  async function handleClick() {
    if (canPromptInstall) {
      const accepted = await promptInstall();
      if (accepted) toast.success('برنامه نصب شد');
      else toast.info('هر وقت خواستی، دوباره از همین دکمه نصب کن');
      return;
    }
    setHelpOpen(true);
  }

  const className = variant === 'landing'
    ? 'landing-install-btn'
    : 'btn-ghost header-action install-btn';

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={handleClick}
        title="نصب برنامه روی گوشی یا رایانه"
      >
        <span aria-hidden><i className="ti ti-download" /></span>
        <span className="btn-label">{variant === 'landing' ? 'نصب برنامه' : 'نصب'}</span>
      </button>
      {helpOpen && <InstallHelpModal platform={getPlatform()} onClose={() => setHelpOpen(false)} />}
    </>
  );
}
