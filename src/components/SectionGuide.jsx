import Ico from './Ico';
import {
  useSectionGuides,
  dismissSectionGuide,
  hideAllSectionGuides,
} from '../utils/sectionGuides';

// ====== کادر راهنمای تصویریِ یک بخش ======
// کنار هر بخشِ پنل، یک کادر کوتاه و تصویری توضیح می‌دهد «اینجا چه‌کار کنم».
// کاربر می‌تواند همان بخش را ببندد («متوجه شدم») یا با یک دکمه همه‌ی راهنماها را
// برای همیشه پنهان کند («دیگه نشون نده»). منطق وضعیت در utils/sectionGuides.js است.
//
// props:
//   userId   — شناسه‌ی کاربر (برای ذخیره‌ی وضعیت)
//   guideKey — کلید یکتای بخش (مثل 'plans')
//   icon     — ایموجی/آیکون تصویری
//   title    — سرتیتر کوتاه
//   items    — آرایه‌ی گام‌ها (رشته)
//   tone     — رنگ کادر: 'indigo' (پیش‌فرض) یا 'sage' | 'amber'
export default function SectionGuide({
  userId,
  guideKey,
  icon,
  title,
  items = [],
  tone = 'indigo',
}) {
  const { isVisible } = useSectionGuides(userId);
  if (!isVisible(guideKey)) return null;

  return (
    <div className={`section-guide tone-${tone}`} role="note">
      <div className="section-guide-visual" aria-hidden>
        <span className="section-guide-emoji">
          <Ico e={icon} />
        </span>
      </div>
      <div className="section-guide-body">
        <div className="section-guide-top">
          <h4 className="section-guide-title">
            <span className="section-guide-badge" aria-hidden>
              <i className="ti ti-help-circle" />
            </span>
            {title}
          </h4>
          <button
            type="button"
            className="section-guide-close"
            onClick={() => dismissSectionGuide(userId, guideKey)}
            aria-label="بستن این راهنما"
            title="بستن این راهنما"
          >
            <Ico e="✕" />
          </button>
        </div>
        {items.length > 0 && (
          <ul className="section-guide-list">
            {items.map((text) => (
              <li key={text}>
                <i className="ti ti-arrow-left" aria-hidden />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="section-guide-foot">
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => dismissSectionGuide(userId, guideKey)}
          >
            متوجه شدم
          </button>
          <button
            type="button"
            className="section-guide-hideall"
            onClick={() => hideAllSectionGuides(userId)}
          >
            <Ico e="🚫" /> دیگه هیچ راهنمایی نشون نده
          </button>
        </div>
      </div>
    </div>
  );
}
