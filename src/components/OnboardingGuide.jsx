import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Ico from './Ico';
import {
  useSectionGuides,
  hideAllSectionGuides,
  showAllSectionGuides,
} from '../utils/sectionGuides';

// ====== تور راهنمای پنل (نقطه‌نمایی روی خودِ صفحه) ======
// مثل راهنمای اپ‌های موبایل: صفحه تیره می‌شود، یک بخش واقعیِ پنل روشن می‌ماند،
// حباب توضیح کنارش می‌آید (با نقطه‌های پیشرفت و دکمه‌های «بعدی» و «رد کردن»).
// تور هم آیتم‌های منو و هم بخش‌های داخل هر صفحه را توضیح می‌دهد: برای هر قدمِ «section»
// خودش به همان بخش می‌رود (رویداد dz:panelsection) و یک عنصر داخل آن را روشن می‌کند.
//
// برای نقاط روشن‌شونده از attribute های data-tour / data-tour-item استفاده می‌شود:
//   - منوی همبرگری: data-tour="menu-btn" و هر آیتم کشو data-tour-item="<key>"
//     (تور خودش کشو را باز و بسته می‌کند)
//   - دکمه‌های هدر: data-tour="deposit" و ...
// اگر هدف پیدا نشد (مثلاً روی گوشی دکمه‌ای در هدر نیست) حباب وسط صفحه می‌آید و متن
// همچنان کامل خوانده می‌شود.
//
// برای عوض‌کردن متن‌ها فقط آرایه‌های STEPS را ویرایش کن. اگر راهنما را عوض اساسی کردی،
// عدد GUIDE_VERSION را بالا ببر تا برای همه یک بار دیگر خودکار نمایش داده شود.

const GUIDE_VERSION = 4;
const storageKey = (userId) => `dz:guide:v${GUIDE_VERSION}:${userId}`;

// اگر حافظه‌ی مرورگر در دسترس نباشد (حالت خصوصی)، دست‌کم در همین نشست دوباره مزاحم نمی‌شویم
const seenThisSession = new Set();

function hasSeen(userId) {
  if (seenThisSession.has(userId)) return true;
  try {
    return localStorage.getItem(storageKey(userId)) === '1';
  } catch {
    return false;
  }
}

function markSeen(userId) {
  seenThisSession.add(userId);
  try {
    localStorage.setItem(storageKey(userId), '1');
  } catch {
    /* مهم نیست */
  }
}

// step: { title, text, menuItem?, section?, target? }
//   menuItem — کلید آیتم منو؛ تور کشو را باز می‌کند و همان آیتم را روشن می‌کند
//   section  — کلید بخشی که تور باید باز کند (داشبورد با رویداد dz:panelsection جواب می‌دهد)
//   target   — انتخابگر CSS عنصری که روشن می‌شود (کشو بسته می‌ماند)
//   اگر بخش باز نشد (مثلاً مشاور هنوز دانش‌آموزی انتخاب نکرده) یا عنصر پیدا نشد، حباب وسط صفحه می‌آید.
// قدم‌های «منوی حساب و پروفایل» — برای همه‌ی نقش‌ها
const ACCOUNT_STEPS = [
  {
    title: 'منوی حساب من',
    text: 'در گوشی از دکمه‌ی آدمک بالای صفحه و در لپ‌تاپ از دکمه‌های کنار هدر: راهنما (همین تور را دوباره می‌بینی)، واریز و تمدید اشتراک، پروفایل و خروج از حساب. تغییر حالت روشن/تاریک و نصب برنامه روی گوشی هم همین‌جاست.',
    accountMenu: true,
    target: ['[data-tour="account-menu"]', '[data-tour="header-actions"]'],
  },
  {
    title: 'عکس پروفایل',
    text: 'یک عکس انتخاب کن تا کنار نامت دیده شود. فرمت‌های رایج مجازند، اندازه تا ۵ مگابایت و خودکار کوچک می‌شود. هر وقت خواستی عکس را عوض یا حذف کن؛ اختیاری است.',
    form: 'profile',
    target: '[data-tour="pf-photo"]',
  },
  {
    title: 'نام و ایمیل',
    text: 'نام کامل را اینجا می‌بینی. دانش‌آموز نمی‌تواند نامش را عوض کند (برای تغییر با مشاور یا سوپرادمین تماس بگیر). ایمیل هم تغییرپذیر نیست و فقط برای ورود استفاده می‌شود.',
    form: 'profile',
    target: '[data-tour="pf-name"]',
  },
  {
    title: 'شماره تماس',
    text: 'شماره‌ات را با هر یک از قالب‌های ۰۹۱۲۳۴۵۶۷۸۹ یا ‎+۹۸۹۱۲۳۴۵۶۷۸۹ بنویس. مشاور و سوپرادمین از همین شماره برای تماس با تو استفاده می‌کنند.',
    form: 'profile',
    target: '[data-tour="pf-phone"]',
  },
  {
    title: 'توضیحات',
    text: 'یک معرفی کوتاه (حداکثر ۵۰۰ نویسه). دانش‌آموز می‌تواند رشته، پایه و هدفش را بنویسد تا مشاور سریع‌تر بشناسدش؛ مشاور هم سابقه و تخصصش را می‌نویسد.',
    form: 'profile',
    target: '[data-tour="pf-bio"]',
  },
  {
    title: 'ذخیره و تغییر رمز',
    text: 'بعد از هر تغییر «ذخیره تغییرات» را بزن. برای عوض‌کردن رمز، دکمه‌ی «تغییر رمز عبور» پایین فرم است؛ رمز فعلی و رمز جدید را وارد می‌کنی.',
    form: 'profile',
    target: ['[data-tour="pf-password"]', '[data-tour="pf-actions"]'],
  },
];

const STUDENT_STEPS = [
  {
    title: 'به پنل دانش‌آموز خوش آمدی',
    text: 'مشاورت برایت برنامه می‌فرستد، تو انجامش را ثبت می‌کنی و پیشرفتت خودکار دیده می‌شود. چند قدم کوتاه نشانت می‌دهم همه‌چیز کجاست.',
  },
  {
    title: 'منوی بخش‌ها',
    text: 'همه‌ی بخش‌های پنل از همین دکمه‌ی سه‌خط باز می‌شود. زیر اسم هر بخش یک توضیح کوتاه نوشته شده.',
    target: '[data-tour="menu-btn"]',
  },
  {
    title: 'مرور اجمالی',
    text: 'صفحه‌ی اصلی پنل تو. خلاصه‌ی وضعیتت و یادآورهای مشاورت همین‌جاست.',
    menuItem: 'home',
  },
  {
    title: 'کارت‌های خلاصه',
    text: 'ساعت مطالعه، پیشرفت هدف هفتگی، امتحان بعدی و وضعیت برنامه‌ات. با هر چیزی که ثبت می‌کنی خودکار به‌روز می‌شود.',
    section: 'home',
    target: '[data-tour="home-stats"]',
  },
  {
    title: 'یادآورهای مشاور',
    text: 'هر پیامی که مشاورت برایت می‌فرستد اینجا می‌آید. وقتی این صفحه را باز می‌کنی خوانده‌شده حساب می‌شود.',
    section: 'home',
    target: '[data-tour="home-reminders"]',
  },
  {
    title: 'برنامه‌های مطالعاتی',
    text: 'برنامه‌ی هفتگی که مشاورت برایت ساخته؛ کارهای هر روز را از اینجا انجام می‌دهی.',
    menuItem: 'plans',
  },
  {
    title: 'نمای برنامه‌ها',
    text: 'با این زبانه‌ها بین فهرست برنامه‌ها، تقویم هفته و آمار روندت جابه‌جا شو. در فهرست، هر درس را که خواندی تیک بزن و زمان و تعداد تست را ثبت کن.',
    section: 'plans',
    target: '[data-tour="plans-tabs"]',
  },
  {
    title: 'تیک زدن هر درس',
    text: 'هر روز را از زبانه‌های بالای کارت باز کن. وقتی یک درس را خواندی، دایره‌ی کنارش را بزن تا «انجام‌شده» شود؛ مشاورت همین را می‌بیند و درصد پیشرفتت از روی آن حساب می‌شود.',
    section: 'plans',
    target: '[data-tour="plan-item"]',
  },
  {
    title: 'ثبت زمان و تست هر درس',
    text: 'زیر هر درس برای هر برچسب (مثل «تمرین» یا «مرور») بنویس چند دقیقه خواندی و چند تست زدی و دکمه‌ی «ثبت» را بزن. عدد را فقط با «ثبت» ذخیره می‌کنی، نه با بستن کادر. این اعداد، آمار و گزارش‌هایت را می‌سازند.',
    section: 'plans',
    target: '[data-tour="plan-log"]',
  },
  {
    title: 'گزینه‌ی مطالعه‌ی آزاد در برنامه',
    text: 'اگر خارج از برنامه‌ی مشاور مطالعه کردی، با زدن دکمه‌ی «ورود به مطالعه‌ی آزاد» بالای همین صفحه، سریع به فرم ثبت منتقل می‌شوی.',
    section: 'plans',
    target: '.free-study-cta-card',
  },
  {
    title: 'مطالعه‌ی آزاد',
    text: 'برنامه‌ی مشاورت پیشنهادی است. هر درسی را که در هر مدتی خواندی — حتی اگر در برنامه نبوده — اینجا ثبت کن تا مشاورت ببیند و در آمار کل بیاید.',
    menuItem: 'free',
  },
  {
    title: 'روش‌های ثبت مطالعه‌ی آزاد',
    text: 'می‌توانی زمان را بر اساس «بازه زمانی (ساعت شروع و پایان)» یا «مجموع مدت زمان (دقیقه)» ثبت کنی؛ تگ درس، فصل و تعداد تست را هم انتخاب کن و دکمه‌ی ثبت را بزن.',
    section: 'free',
    target: '[data-tour="free-study"]',
  },
  {
    title: 'آزمون‌های مشاور',
    text: 'آزمون‌هایی که مشاورت تعیین می‌کند در زمان خودشان باز می‌شوند؛ بعد از تصحیح، نمره و پاسخ‌ها را اینجا می‌بینی.',
    menuItem: 'exams',
  },
  {
    title: 'امتحان‌ها و پرسش‌های مدرسه',
    text: 'امتحان‌ها و پرسش‌های مدرسه‌ات را با تاریخ ثبت کن. مشاورت از روی همین فهرست برنامه‌ات را با امتحان‌هایت هم‌تراز می‌کند.',
    menuItem: 'school',
  },
  {
    title: 'نوع مورد: امتحان یا پرسش',
    text: 'اول انتخاب کن این مورد «امتحان» است (مثل امتحان نوبت اول) یا «پرسش» (مثل پرسش کلاسی کوتاه). با دکمه‌ی «+ مورد جدید» این فرم باز می‌شود.',
    section: 'school',
    form: 'school-form',
    target: '[data-tour="sf-kind"]',
  },
  {
    title: 'عنوان و تاریخ',
    text: 'عنوان را روشن بنویس (مثلاً «امتحان ریاضی نوبت اول») و «تاریخ برگزاری» را از تقویم شمسی انتخاب کن. هر دو لازم‌اند؛ مشاورت از روی همین تاریخ برنامه‌ی آمادگی می‌چیند.',
    section: 'school',
    form: 'school-form',
    target: ['[data-tour="sf-title"]'],
  },
  {
    title: 'درس (اختیاری)',
    text: 'اسم درس را بنویس (مثلاً «ریاضی ۲»). وقتی پر باشد، بلوک‌های مطالعه‌ی این امتحان در برنامه با همین نام درس ساخته می‌شوند.',
    section: 'school',
    form: 'school-form',
    target: '[data-tour="sf-subject"]',
  },
  {
    title: 'چند بازه لازم داری؟',
    text: 'تخمین خودت از تعداد بازه‌های مطالعه (هر بازه حدود یک جلسه‌ی ۹۰ دقیقه‌ای) که برای آماده‌شدن لازم داری؛ مثلاً ۴. مشاورت دقیقاً به همین تعداد بلوک قبل از امتحان در برنامه‌ات می‌گذارد. خالی بگذاری، یک بلوک می‌گیرد.',
    section: 'school',
    form: 'school-form',
    target: '[data-tour="sf-sessions"]',
  },
  {
    title: 'توضیح و ثبت',
    text: 'اگر نکته‌ای مهم است بنویس (مثلاً «فصل ۱ تا ۴ — نمره‌دار»). آخر کار «ثبت» را بزن؛ بعداً هم می‌توانی هر مورد را ویرایش یا حذف کنی.',
    section: 'school',
    form: 'school-form',
    target: ['[data-tour="sf-note"]', '[data-tour="sf-actions"]'],
  },
  {
    title: 'کارنامه‌ی آزمون‌های آزمایشی',
    text: 'نتیجه‌ی آزمون‌های آزمایشی بیرونی (مثل قلم‌چی و گاج) را ثبت کن: تراز و درصد هر درس.',
    menuItem: 'mock',
  },
  {
    title: 'نمودار روند',
    text: 'با ثبت هر کارنامه، روند تراز و درصدهایت اینجا رسم می‌شود تا ببینی کجا رشد کرده‌ای. با «+ نمره‌ی جدید» فرم ثبت باز می‌شود.',
    section: 'mock',
    target: '[data-tour="mock-card"]',
  },
  {
    title: 'عنوان و تاریخ آزمون',
    text: 'اسم آزمون را همان‌طور که روی کارنامه نوشته بنویس (مثلاً «آزمون ملی تجربی فروردین») و تاریخ برگزاری را انتخاب کن. هر دو لازم‌اند.',
    section: 'mock',
    form: 'mock-form',
    target: ['[data-tour="mf-title"]'],
  },
  {
    title: 'تراز کل',
    text: 'تراز کلی کارنامه را بنویس؛ اختیاری است. منفی نباشد، سقفی هم برایش نیست. نمودار روند با همین عدد رسم می‌شود.',
    section: 'mock',
    form: 'mock-form',
    target: '[data-tour="mf-rank"]',
  },
  {
    title: 'درصدها',
    text: 'برای هر درس یا گروه، یک ردیف اضافه کن: نام (مثلاً «عمومی»، «اختصاصی» یا «زیست») و درصدش. با «+ افزودن درصد» ردیف تازه می‌گیری. این ردیف‌ها در نمودار، خط جدا دارند.',
    section: 'mock',
    form: 'mock-form',
    target: '[data-tour="mf-percent"]',
  },
  {
    title: 'ثبت نمره',
    text: 'آخر کار «ثبت نمره» را بزن. بعداً هر نمره را می‌توانی ویرایش یا حذف کنی.',
    section: 'mock',
    form: 'mock-form',
    target: '[data-tour="mf-actions"]',
  },
  {
    title: 'دعوت دوستان و تخفیف',
    text: 'دوستت را دعوت کن تا هر دوی شما تخفیف شهریه بگیرید.',
    menuItem: 'invite',
  },
  {
    title: 'لینک دعوت من',
    text: 'این لینک را برای دوستت بفرست. با ثبت‌نام او، به همان مشاور تو وصل می‌شود.',
    section: 'invite',
    target: '[data-tour="friend-link"]',
  },
  {
    title: 'میزان تخفیف',
    text: 'بعد از اولین پرداخت دوستت، هر دوی شما بین ۵ تا ۱۵ درصد تخفیف شهریه‌ی ماهانه می‌گیرید (برای یک سال). مجموع تخفیف حداکثر ۱۵ درصد است.',
    section: 'invite',
    target: '[data-tour="friend-meter"]',
  },
  {
    title: 'اتصال والدین',
    text: 'یک کد ۸ حرفی بساز و به والدت بده تا فقط پیشرفتت را ببیند.',
    menuItem: 'parent',
  },
  {
    title: 'ساخت کد والدین',
    text: 'کد یک‌بارمصرف است و ۷ روز اعتبار دارد. والدت آن را در پنل خودش وارد می‌کند و فقط‌خواندنی می‌بیند.',
    section: 'parent',
    target: '[data-tour="parent-card"]',
  },
  ...ACCOUNT_STEPS,
  {
    title: 'اشتراک و واریز',
    text: 'وضعیت اشتراک و ثبت رسید واریز از دکمه‌ی «واریز» بالای صفحه (در گوشی داخل منوی حساب) است. برنامه را هم می‌توانی روی گوشی نصب کنی.',
    target: '[data-tour="deposit"]',
  },
];

const ADVISOR_STEPS = [
  {
    title: 'به پنل مشاور خوش آمدی',
    text: 'از اینجا دانش‌آموزانت را مدیریت می‌کنی: برنامه می‌سازی، آزمون می‌گذاری و پیشرفتشان را می‌بینی. چند قدم کوتاه نشانت می‌دهم همه‌چیز کجاست.',
  },
  {
    title: 'منوی بخش‌ها',
    text: 'همه‌ی بخش‌ها از همین دکمه‌ی سه‌خط باز می‌شود. بخش‌های مخصوص دانش‌آموز بعد از انتخاب یک دانش‌آموز فعال می‌شوند.',
    target: '[data-tour="menu-btn"]',
  },
  {
    title: 'دانش‌آموزها',
    text: 'فهرست دانش‌آموزانت و لینک دعوت اینجاست.',
    menuItem: 'students',
  },
  {
    title: 'لینک دعوت دانش‌آموز',
    text: 'لینک را برای دانش‌آموز بفرست؛ بدون تأیید و بدون انتخاب مشاور مستقیم به تو وصل می‌شود. از همین کارت می‌توانی لینک را غیرفعال یا تازه کنی و تخفیف دعوت دوستان را روشن یا خاموش کنی.',
    section: 'students',
    target: '[data-tour="invite-card"]',
  },
  {
    title: 'فهرست دانش‌آموزان',
    text: 'یک دانش‌آموز را انتخاب کن تا بخش‌های مخصوص او (مرور اجمالی، برنامه‌ها، آزمون‌ها و…) فعال شوند.',
    section: 'students',
    target: '[data-tour="student-picker"]',
  },
  {
    title: 'درخواست‌های جدید',
    text: 'دانش‌آموزی که خودش تو را انتخاب کرده اینجا منتظر تأیید توست. دانش‌آموزهای لینک دعوت اینجا نمی‌آیند؛ مستقیم وصل می‌شوند.',
    menuItem: 'requests',
  },
  {
    title: 'مرور اجمالی',
    text: 'خلاصه‌ی وضعیت یک دانش‌آموز، هدف هفتگی، یادآورها و یادداشت‌های خصوصی تو.',
    menuItem: 'profile',
  },
  {
    title: 'کارت‌های خلاصه',
    text: 'درصد انجام برنامه، ساعت مطالعه نسبت به هدف، امتحان بعدی و آخرین کارنامه‌ی آزمایشی دانش‌آموز.',
    section: 'profile',
    target: '[data-tour="ov-summary"]',
  },
  {
    title: 'هدف هفتگی',
    text: 'هدف ساعت مطالعه‌ی هفتگی دانش‌آموز را اینجا تعیین یا ویرایش کن. پیشرفت او نسبت به همین عدد سنجیده می‌شود.',
    section: 'profile',
    target: '[data-tour="ov-goal"]',
  },
  {
    title: 'یادآورها',
    text: 'یک پیام کوتاه برای دانش‌آموز بنویس؛ در «مرور اجمالی» خودش می‌آید و می‌بیند خوانده یا نه.',
    section: 'profile',
    target: '[data-tour="ov-reminders"]',
  },
  {
    title: 'یادداشت‌های خصوصی',
    text: 'هر چیزی که درباره‌ی دانش‌آموز می‌خواهی یادت بماند بنویس. فقط خودت می‌بینی؛ دانش‌آموز و والدش هیچ‌وقت نمی‌بینند.',
    section: 'profile',
    target: '[data-tour="ov-notes"]',
  },
  {
    title: 'برنامه‌ها',
    text: 'برنامه‌ی هفتگی را با روزها و درس‌ها می‌سازی. پیش‌نویس‌های ساخته‌شده از امتحان‌ها هم اینجاست تا ویرایش و منتشرشان کنی.',
    menuItem: 'plans',
  },
  {
    title: 'ساخت برنامه‌ی جدید',
    text: 'با این دکمه فرم ساخت برنامه باز می‌شود. قدم‌های بعد فیلدهای آن را یکی‌یکی توضیح می‌دهند.',
    section: 'plans',
    target: '[data-tour="plans-new"]',
  },
  {
    title: 'عنوان و تاریخ‌ها',
    text: 'عنوان را روشن بنویس (مثلاً «برنامه‌ی هفته‌ی اوّل»)؛ لازم است. «تاریخ شروع» روزی است که برنامه برای دانش‌آموز فعال می‌شود. «تاریخ پایان» اختیاری است؛ اگر خالی بماند برنامه تاریخ پایان ندارد و بعد از پایان، دیگر برایش نمایش داده نمی‌شود.',
    section: 'plans',
    form: 'plan-builder',
    target: '[data-tour="pb-title-row"]',
  },
  {
    title: 'توضیح کلی',
    text: 'یک پیام یا توصیه برای کل برنامه (اختیاری)، مثل «این هفته تمرکز روی تست زیست». دانش‌آموز آن را بالای برنامه‌اش می‌بیند.',
    section: 'plans',
    form: 'plan-builder',
    target: '[data-tour="pb-note"]',
  },
  {
    title: 'تگ‌های درسی',
    text: 'تگ‌ها برچسب‌هایی مثل «تمرین»، «مرور» و «آمادگی امتحان» هستند که روی هر درس می‌زنی. دانش‌آموز برای هر تگ جدا زمان و تعداد تست ثبت می‌کند و گزارش‌ها هم بر اساس همین تگ‌ها ساخته می‌شود. تگ تازه را اینجا باز کن و اضافه کن.',
    section: 'plans',
    form: 'plan-builder',
    target: '[data-tour="pb-tags"]',
  },
  {
    title: 'روزهای هفته',
    text: 'هر روزی که درس دارد را با کلید همان روز روشن کن؛ روز خاموش در برنامه نمی‌آید. بعد «+ افزودن درس به این روز» را بزن. درس‌ها را می‌توانی با کشیدن جابه‌جا کنی و هر درس را جمع یا باز کنی.',
    section: 'plans',
    form: 'plan-builder',
    target: '[data-tour="pb-days"]',
  },
  {
    title: 'فیلدهای هر درس',
    text: 'نام درس لازم است؛ «فصل» و «بخش» اختیاری‌اند ولی گزارش را دقیق‌تر می‌کنند. یک توضیح کوتاه هم بنویس. ساعت شروع و پایان را بزن تا درس در تقویم هفتگی بیاید، و در انتها تگ‌های مناسب را انتخاب کن. اگر هنوز روزی روشن نکرده‌ای، این کادر دیده نمی‌شود.',
    section: 'plans',
    form: 'plan-builder',
    target: '[data-tour="pb-item"]',
  },
  {
    title: 'ذخیره و پیش‌نویس',
    text: '«ساخت برنامه» آن را برای دانش‌آموز منتشر می‌کند. تا وقتی ذخیره نکرده‌ای، هر چه نوشته‌ای خودکار در مرورگر نگه داشته می‌شود؛ اگر صفحه بسته شود دفعه‌ی بعد پیشنهاد بازیابی می‌گیری.',
    section: 'plans',
    form: 'plan-builder',
    target: '[data-tour="pb-actions"]',
  },
  {
    title: 'آزمون‌ها',
    text: 'آزمون تستی یا تشریحی بساز، زمان نمایش را تعیین کن و بعد از ثبت پاسخ‌ها نمره بده.',
    menuItem: 'exams',
  },
  {
    title: 'ساخت آزمون',
    text: 'با این دکمه فرم ساخت آزمون باز می‌شود. قدم‌های بعد فیلدهای آن را توضیح می‌دهند.',
    section: 'exams',
    target: '[data-tour="exams-new"]',
  },
  {
    title: 'انتخاب دانش‌آموز',
    text: 'آزمون را برای یک یا چند دانش‌آموز می‌سازی؛ با جستجو یا انتخاب همه می‌توانی سریع انتخاب کنی. این بخش فقط در آزمون جدید دیده می‌شود، چون در ویرایش دانش‌آموز ثابت است.',
    section: 'exams',
    form: 'exam-builder',
    target: '[data-tour="eb-students"]',
  },
  {
    title: 'عنوان و مدت',
    text: 'عنوان را مشخص بنویس (مثلاً «آزمون فصل ۳ ریاضی») و «مدت» را به دقیقه وارد کن. هر دو لازم‌اند.',
    section: 'exams',
    form: 'exam-builder',
    target: '[data-tour="eb-title-row"]',
  },
  {
    title: 'زمان شروع',
    text: 'تاریخ و ساعت شروع را بگذار. دانش‌آموز قبل از این زمان نمی‌تواند آزمون را شروع کند.',
    section: 'exams',
    form: 'exam-builder',
    target: '[data-tour="eb-when"]',
  },
  {
    title: 'نمایش به دانش‌آموز',
    text: 'اگر تیک نمایش فوری روشن باشد، آزمون همین حالا در پنل دانش‌آموز دیده می‌شود. اگر خاموشش کنی می‌توانی زمان نمایش را جدا تعیین کنی؛ خالی بگذاری، تا زمان شروع آزمون مخفی می‌ماند.',
    section: 'exams',
    form: 'exam-builder',
    target: '[data-tour="eb-visibility"]',
  },
  {
    title: 'سؤال‌ها',
    text: 'با «+ افزودن سؤال» سؤال اضافه کن. نوع هر سؤال «تستی (چهارگزینه‌ای)» یا «تشریحی» است. آزمون فقط‌تستی بعد از ارسال خودکار نمره می‌گیرد؛ تشریحی را خودت نمره می‌دهی و ترکیبی هر دو را دارد.',
    section: 'exams',
    form: 'exam-builder',
    target: '[data-tour="eb-questions"]',
  },
  {
    title: 'متن، گزینه‌ها و نمره‌ی سؤال',
    text: 'متن سؤال (و در صورت نیاز عکس) را بنویس. برای تستی چهار گزینه را پر کن و گزینه‌ی درست را علامت بزن. «نمره» وزن همین سؤال در نمره‌ی کل است.',
    section: 'exams',
    form: 'exam-builder',
    target: '[data-tour="eb-question"]',
  },
  {
    title: 'ذخیره‌ی آزمون',
    text: 'آخر کار «ساخت آزمون» را بزن. تا وقتی ذخیره نکرده‌ای، پیش‌نویس خودکار نگه داشته می‌شود تا با بستن صفحه از دست نرود.',
    section: 'exams',
    form: 'exam-builder',
    target: '[data-tour="eb-actions"]',
  },
  {
    title: 'امتحان‌های مدرسه',
    text: 'امتحان‌هایی که دانش‌آموز ثبت کرده را اینجا می‌بینی.',
    menuItem: 'school',
  },
  {
    title: 'ساخت برنامه از بازه‌ی امتحان‌ها',
    text: 'بازه‌ی روزهای امتحان را انتخاب کن تا پیش‌نویس برنامه‌ی آمادگی خودکار ساخته شود. تا وقتی منتشرش نکنی دانش‌آموز نمی‌بیند.',
    section: 'school',
    target: '[data-tour="school-range"]',
  },
  {
    title: 'کارنامه‌ی آزمایشی',
    text: 'نمودار تراز و درصدهای آزمون‌های آزمایشی که دانش‌آموز ثبت کرده؛ برای مشاور فقط‌خواندنی است.',
    menuItem: 'mock',
  },
  {
    title: 'مطالعه‌ی آزاد دانش‌آموز',
    text: 'درس‌هایی که دانش‌آموز جدا از برنامه‌ی تو خوانده و ثبت کرده، در بخش مطالعه‌ی آزاد و در گزارش‌های هفتگی به تفکیک دیده می‌شود.',
    menuItem: 'free',
  },
  ...ACCOUNT_STEPS,
  {
    title: 'اشتراک و واریز',
    text: 'وضعیت اشتراک و رسیدهای واریز از دکمه‌ی «واریز» بالای صفحه (در گوشی داخل منوی حساب) است.',
    target: '[data-tour="deposit"]',
  },
];

const SUPERADMIN_EXTRA = {
  title: 'مدیریت مشاوران',
  text: 'بخش مخصوص سوپرادمین: تأیید مشاوران، سقف دانش‌آموز فعال، دیدن روش ورود هر دانش‌آموز (لینک مشاور، لینک دوست یا ثبت‌نام عادی)، اشتراک و آموزشگاه‌ها.',
  menuItem: 'admin',
};

const PARENT_STEPS = [
  {
    title: 'به پنل والدین خوش آمدید',
    text: 'اینجا پیشرفت مطالعه‌ی فرزندتان را می‌بینید. این پنل فقط‌خواندنی است و چیزی را تغییر نمی‌دهد.',
  },
  {
    title: 'اتصال به فرزند',
    text: 'فرزندتان از پنل خودش یک کد ۸ حرفی می‌سازد. آن را در کارت «اتصال به فرزند» وارد کنید. برای فرزند دوم هم همین کار را تکرار کنید.',
  },
  {
    title: 'انتخاب فرزند',
    text: 'اگر چند فرزند وصل کرده‌اید، با زبانه‌های بالای صفحه بین آن‌ها جابه‌جا شوید.',
  },
  {
    title: 'چه چیزهایی را می‌بینید',
    text: 'درصد انجام برنامه و ساعت مطالعه نسبت به هدف هفتگی، نمودار کارنامه‌ی آزمون‌های آزمایشی و نمره‌ی آزمون‌های مشاور.',
  },
  {
    title: 'اشتراک و پرداخت',
    text: 'برای تمدید، از دکمه‌ی «واریز و تمدید» مبلغ را به کارت معرفی‌شده واریز و عکس رسید را ثبت کنید؛ تأیید با مشاور یا مؤسسه است.',
    target: '[data-tour="deposit"]',
  },
];

// بخش‌های مخصوص دانش‌آموزِ پنل مشاور — تا انتخاب دانش‌آموز غیرفعال‌اند
const STUDENT_KEYS = new Set(['profile', 'plans', 'exams', 'school', 'mock']);
const needsStudent = (st) => STUDENT_KEYS.has(st.menuItem || st.section);

const STUDENTS_BRIDGE = {
  title: 'بخش‌های مخصوص دانش‌آموز',
  text: 'مرور اجمالی، برنامه‌ها، آزمون‌ها، امتحان‌های مدرسه و کارنامه‌ی آزمایشی بعد از انتخاب یک دانش‌آموز فعال می‌شوند. اولین بار که واردشان شوی، همان‌جا توضیحشان را نشانت می‌دهم.',
  menuItem: 'profile',
};

const STUDENTS_INTRO = {
  title: 'بخش‌های مخصوص این دانش‌آموز',
  text: 'حالا که یک دانش‌آموز انتخاب کرده‌ای، بخش‌های مخصوص او فعال شده‌اند. این چند قدم کوتاه نشانت می‌دهد هر کدام برای چیست.',
};

// part: 'all' (همه‌ی قدم‌ها؛ برای دکمه‌ی «راهنما») | 'main' (بخش‌های عمومی؛ اجرای خودکار بار اول)
//       | 'students' (بخش‌های مخصوص دانش‌آموز؛ اولین بار که مشاور واردشان می‌شود)
export function getGuideSteps(role, part = 'all') {
  switch (role) {
    case 'STUDENT':
      return STUDENT_STEPS;
    case 'ADVISOR':
    case 'SUPERADMIN': {
      const base = role === 'SUPERADMIN'
        ? [...ADVISOR_STEPS.slice(0, -1), SUPERADMIN_EXTRA, ADVISOR_STEPS[ADVISOR_STEPS.length - 1]]
        : ADVISOR_STEPS;
      if (part === 'students') return [STUDENTS_INTRO, ...base.filter(needsStudent)];
      if (part === 'main') {
        const general = base.filter((st) => !needsStudent(st));
        return [...general.slice(0, -1), STUDENTS_BRIDGE, general[general.length - 1]];
      }
      return base;
    }
    case 'PARENT':
      return PARENT_STEPS;
    default:
      return null; // نقش‌های دیگر (مثل مدیر مؤسسه) راهنمایی ندارند
  }
}

// منطق باز شدن: خودکار برای بار اول + باز/بسته‌کردن دستی.
// تا وقتی کاربر باید مشخصات یا رمزش را کامل کند، راهنما باز نمی‌شود تا دو پنجره روی هم نیفتند.
export function useOnboardingGuide(user, mustChangePassword) {
  const [open, setOpen] = useState(false);
  const [part, setPart] = useState('main');
  const userId = user?.id;
  const role = user?.role;
  const hasGuide = !!getGuideSteps(role);
  const blocked = user?.registrationComplete === false || mustChangePassword === true;
  const advisorLike = role === 'ADVISOR' || role === 'SUPERADMIN';
  const studentsKey = userId ? `${userId}:students` : null;

  useEffect(() => {
    if (!userId || !hasGuide || blocked || hasSeen(userId)) return undefined;
    // کمی صبر می‌کنیم تا صفحه جا بیفتد و پرش نداشته باشد
    const timer = setTimeout(() => {
      setPart('main');
      setOpen(true);
    }, 700);
    return () => clearTimeout(timer);
  }, [userId, hasGuide, blocked]);

  // مشاور: اولین بار که با دانش‌آموزِ انتخاب‌شده وارد یک بخش مخصوص دانش‌آموز می‌شود،
  // توضیح همان بخش‌ها خودکار نمایش داده می‌شود (داشبورد رویداد dz:enteredstudentsection را می‌فرستد).
  // تا تور اصلی دیده نشده یا باز است صبر می‌کنیم.
  useEffect(() => {
    if (!advisorLike || !studentsKey || blocked) return undefined;
    const onEntered = () => {
      if (open || !hasSeen(userId) || hasSeen(studentsKey)) return;
      setTimeout(() => {
        setPart('students');
        setOpen(true);
      }, 600);
    };
    window.addEventListener('dz:enteredstudentsection', onEntered);
    return () => window.removeEventListener('dz:enteredstudentsection', onEntered);
  }, [advisorLike, studentsKey, userId, blocked, open]);

  const close = useCallback(() => {
    setOpen(false);
    if (!userId) return;
    // دکمه‌ی «راهنما» (part=all) هر دو بخش را دیده‌شده می‌کند
    if (part === 'main' || part === 'all') markSeen(userId);
    if (part === 'students' || part === 'all') markSeen(`${userId}:students`);
    // بعد از بستن تور اصلی، اگر مشاور همین حالا در بخش دانش‌آموزی است، توضیح آن را هم نشان بده
    if (part === 'main') {
      setTimeout(() => window.dispatchEvent(new CustomEvent('dz:recheckstudentsection')), 500);
    }
  }, [userId, part]);

  const show = useCallback(() => {
    setPart('all');
    setOpen(true);
  }, []);

  return { open, part, show, close, hasGuide };
}

const PAD = 8; // فاصله‌ی هاله‌ی روشن تا لبه‌ی عنصر
const GAP = 14; // فاصله‌ی حباب تا عنصر
const EDGE = 12; // حداقل فاصله از لبه‌ی صفحه
const BOTTOM_ZONE = 24; // حداقل فاصله‌ی حباب از پایین صفحه
const MOBILE_MAX = 600; // عرض گوشی: حباب به‌صورت کشوی پایین/بالا (نه کنار عنصر) نمایش داده می‌شود
const MOBILE_TOP_OFFSET = 84; // روی گوشی عنصر هدف را زیر هدر چسبان تا این‌قدر از بالای صفحه می‌آوریم
const isMobileView = () => window.innerWidth <= MOBILE_MAX;

function setDrawer(open) {
  window.dispatchEvent(new CustomEvent('dz:panelmenu', { detail: { open } }));
}

// از داشبورد می‌خواهد بخش مورد نظر را باز کند؛ اگر بخش در دسترس باشد داشبورد detail.ok را true می‌کند
function openSection(key) {
  const detail = { key, ok: false };
  window.dispatchEvent(new CustomEvent('dz:panelsection', { detail }));
  return detail.ok;
}

export default function OnboardingGuide({ role, open, onClose, userId, part = 'all' }) {
  const steps = getGuideSteps(role, part);
  const { hidden: inlineGuidesHidden } = useSectionGuides(userId);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null); // مستطیل عنصر روشن‌شده
  const [pos, setPos] = useState(null); // جای حباب
  const bubbleRef = useRef(null);
  const primaryRef = useRef(null);
  const lastFocused = useRef(null);
  const initialSection = useRef(null); // بخشی که کاربر قبل از شروع تور در آن بود
  const sectionOk = useRef(true);
  const currentForm = useRef(null); // فرمی که تور باز کرده (برای بستن بعد از قدم)
  const accountOpen = useRef(false);
  const measureToken = useRef(0); // برای لغو اندازه‌گیری‌های کهنه وقتی قدم عوض شده

  const total = steps ? steps.length : 0;
  const isLast = index === total - 1;
  const step = steps ? steps[index] : null;

  // با هر بار باز شدن از اولین قدم شروع می‌کنیم
  useEffect(() => {
     
    if (open) setIndex(0);
  }, [open]);

  // قفل‌کردن اسکرول پس‌زمینه + برگرداندن فوکوس بعد از بستن + بستن کشو
  useEffect(() => {
    if (!open) return undefined;
    lastFocused.current = document.activeElement;
    initialSection.current = new URLSearchParams(window.location.search).get('s');
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      setDrawer(false);
      if (currentForm.current) {
        window.dispatchEvent(new CustomEvent('dz:tourform', { detail: { form: null, ok: false } }));
        currentForm.current = null;
      }
      if (accountOpen.current) {
        window.dispatchEvent(new CustomEvent('dz:accountmenu', { detail: { open: false } }));
        accountOpen.current = false;
      }
      // بعد از تور به همان بخشی برمی‌گردیم که کاربر در آن بود
      openSection(initialSection.current || '__default');
      // کشوی منو قفل اسکرولِ خودش را بعد از بسته‌شدن برمی‌گرداند و مقدار «hidden» را که از تور گرفته
      // دوباره می‌گذارد؛ پس مقدار اصلی را کمی بعد از بسته‌شدن کشو برمی‌گردانیم تا صفحه قفل نماند
      document.body.style.overflow = prevOverflow;
      setTimeout(() => { document.body.style.overflow = prevOverflow; }, 60);
      if (lastFocused.current && typeof lastFocused.current.focus === 'function') {
        lastFocused.current.focus();
      }
    };
  }, [open]);

  // پیدا کردن و اندازه‌گیری هدف هر قدم.
  // اسکرول در گوشی (به‌خصوص ایفون) async است؛ پس صبر می‌کنیم موقعیت عنصر چند فریم ثابت بماند
  // و بعد هاله را می‌گذاریم، وگرنه هاله روی جای قدیمیِ عنصر می‌ماند و حباب روی خود هدف می‌افتد.
  const measure = useCallback(() => {
    if (!step) return;
    const token = ++measureToken.current;
    // target می‌تواند یک انتخابگر یا فهرستی از انتخابگرها باشد؛ اولین عنصرِ قابل‌مشاهده انتخاب می‌شود
    // (مثلاً منوی حساب در گوشی و دکمه‌های هدر در دسکتاپ)
    const selectors = step.menuItem ? [`[data-tour-item="${step.menuItem}"]`] : [].concat(step.target || []);
    let el = null;
    if (sectionOk.current) {
      for (const sel of selectors) {
        const found = document.querySelector(sel);
        if (found) {
          const fr = found.getBoundingClientRect();
          if (fr.width > 0 || fr.height > 0) { el = found; break; }
        }
      }
    }
    if (!el) {
      setRect(null);
      return;
    }

    const mobile = isMobileView();
    if (step.menuItem) {
      // آیتم‌های کشوی منو: اگر خودِ کشو اسکرول دارد، آیتم را داخلش بیاور
      el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    } else if (mobile) {
      // گوشی: هدف را بالای صفحه می‌گذاریم و حباب پایین می‌نشیند
      const top = el.getBoundingClientRect().top;
      window.scrollTo({ top: Math.max(0, window.scrollY + top - MOBILE_TOP_OFFSET), behavior: 'auto' });
    } else {
      el.scrollIntoView({ block: 'center', behavior: 'auto' });
    }

    let last = '';
    let stable = 0;
    let frames = 0;
    const tick = () => {
      if (token !== measureToken.current) return; // قدم عوض شده
      const r = el.getBoundingClientRect();
      const key = `${Math.round(r.top)}|${Math.round(r.left)}|${Math.round(r.width)}|${Math.round(r.height)}`;
      stable = key === last ? stable + 1 : 0;
      last = key;
      frames += 1;
      if (stable >= 3 || frames >= 45) {
        if (r.width === 0 && r.height === 0) {
          setRect(null);
          return;
        }
        // کارت‌های خیلی بلند: فقط بخش بالایی روشن می‌شود تا حباب جا داشته باشد
        const vh = window.innerHeight;
        const bubbleH = bubbleRef.current ? bubbleRef.current.offsetHeight : 0;
        const maxH = mobile && !step.menuItem
          ? Math.max(90, vh - bubbleH - MOBILE_TOP_OFFSET - 28)
          : vh * 0.5;
        setRect({ top: r.top, left: r.left, width: r.width, height: Math.min(r.height, maxH) });
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [step]);

  // با تغییر قدم: کشو/منوی حساب/بخش/فرم را در صورت نیاز باز یا بسته کن، بعد اندازه بگیر
  useEffect(() => {
    if (!open || !step) return undefined;
     
    setRect(null);
    setDrawer(!!step.menuItem);

    // منوی حساب (فقط گوشی؛ در دسکتاپ دکمه‌های حساب مستقیم در هدرند)
    const wantAccount = !!step.accountMenu && window.innerWidth <= 720;
    if (wantAccount !== accountOpen.current) {
      window.dispatchEvent(new CustomEvent('dz:accountmenu', { detail: { open: wantAccount } }));
      accountOpen.current = wantAccount;
    }

    // فرمی که قدم قبل باز کرده و این قدم لازمش ندارد بسته می‌شود
    if (currentForm.current && currentForm.current !== step.form) {
      window.dispatchEvent(new CustomEvent('dz:tourform', { detail: { form: null, ok: false } }));
      currentForm.current = null;
    }

    // قدم‌های «داخل بخش»: اول بخش را باز می‌کنیم (اگر نشد، حباب وسط صفحه می‌آید)
    sectionOk.current = step.section ? openSection(step.section) : true;

    const finish = () => {
      measure();
      // باز شدن کشو/منو فوکوس را جابه‌جا می‌کند؛ فوکوس را به دکمه‌ی «بعدی» برمی‌گردانیم
      // تا Enter ناخواسته چیزی را باز نکند
      primaryRef.current?.focus({ preventScroll: true });
    };

    let t2;
    const t1 = setTimeout(() => {
      if (step.form && currentForm.current !== step.form) {
        // فرم بعد از باز شدن بخش باز می‌شود تا کامپوننتش آماده‌ی شنیدن رویداد باشد
        const detail = { form: step.form, ok: false };
        window.dispatchEvent(new CustomEvent('dz:tourform', { detail }));
        currentForm.current = step.form;
        if (!detail.ok) sectionOk.current = false;
        t2 = setTimeout(finish, 420);
      } else if (step.form) {
        t2 = setTimeout(finish, 120);
      } else {
        finish();
      }
    }, step.menuItem ? 360 : step.section || step.form || wantAccount ? 480 : 120);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [open, index, step, measure]);

  // چرخش گوشی / تغییر اندازه
  useEffect(() => {
    if (!open) return undefined;
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [open, measure]);

  // جای حباب: کنار هدف (چپِ آیتم‌های کشو، یا زیر/بالای عنصرهای دیگر)؛ بدون هدف: وسط صفحه
  const isPosEmpty = pos === null;
  useLayoutEffect(() => {
    if (!open || !bubbleRef.current) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const bw = Math.min(330, vw - EDGE * 2);
    const bh = bubbleRef.current.offsetHeight;
    const clampX = (x) => Math.max(EDGE, Math.min(x, vw - bw - EDGE));
    const clampY = (y) => Math.max(EDGE, Math.min(y, vh - bh - EDGE));

    // گوشی: حباب یک کشوی عرض‌کامل است. اگر هدف در نیمه‌ی پایین صفحه باشد (آیتم‌های پایینِ منو)
    // حباب بالا می‌نشیند، وگرنه پایین؛ عنصرهای داخل صفحه هم به بالای صفحه اسکرول شده‌اند.
    if (vw <= MOBILE_MAX) {
      const targetLow = rect && step?.menuItem && rect.top + rect.height / 2 > vh / 2;
      setPos({ mode: rect ? (targetLow ? 'top' : 'bottom') : 'center', width: vw - EDGE * 2, left: EDGE, top: clampY((vh - bh) / 2) });
      return;
    }

    if (!rect) {
      setPos({ width: bw, left: clampX((vw - bw) / 2), top: clampY((vh - BOTTOM_ZONE - bh) / 2 + 20) });
      return;
    }
    const cx = rect.left + rect.width / 2;
    // کشوی کناری (آیتم منو): حباب سمت چپ آیتم اگر جا بود
    if (step?.menuItem && rect.left - bw - GAP >= EDGE) {
      setPos({ width: bw, left: rect.left - bw - GAP, top: clampY(rect.top + rect.height / 2 - bh / 2) });
      return;
    }
    const below = rect.top + rect.height + PAD + GAP;
    const above = rect.top - PAD - GAP - bh;
    if (below + bh <= vh - BOTTOM_ZONE) {
      setPos({ width: bw, left: clampX(cx - bw / 2), top: below });
    } else if (above >= EDGE) {
      setPos({ width: bw, left: clampX(cx - bw / 2), top: above });
    } else {
      setPos({ width: bw, left: clampX(cx - bw / 2), top: clampY(below) });
    }
  }, [open, rect, step, index, isPosEmpty]);

  // فوکوس روی «بعدی» با هر قدم
  useEffect(() => {
    if (!open) return;
    primaryRef.current?.focus({ preventScroll: true });
  }, [open, index]);

  const next = useCallback(() => setIndex((i) => Math.min(i + 1, total - 1)), [total]);
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  // کیبورد: Esc بستن؛ در صفحه‌ی راست‌به‌چپ، پیکان چپ = بعدی و پیکان راست = قبلی
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowLeft') {
        next();
      } else if (e.key === 'ArrowRight') {
        prev();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, next, prev, onClose]);

  if (!open || !steps || !step) return null;

  const spot = rect && {
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  };

  // با پورتال به body می‌رود تا هدر (که افکت محو‌کننده دارد) جای نمایش ثابت را خراب نکند
  return createPortal(
    <div className="tour-root" role="presentation">
      {/* لایه‌ی تیره: بدون هدف کل صفحه تیره است؛ با هدف، هاله‌ی روشن دور عنصر می‌افتد */}
      <div className={`tour-dim ${spot ? 'has-spot' : ''}`} onClick={(e) => e.stopPropagation()} />
      {spot && (
        <div
          className="tour-spot"
          aria-hidden="true"
          style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
        />
      )}

      <div
        ref={bubbleRef}
        className={`tour-bubble ${pos ? 'is-placed' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        style={pos
          ? pos.mode === 'bottom'
            ? { bottom: `calc(${EDGE}px + env(safe-area-inset-bottom, 0px))`, left: pos.left, width: pos.width }
            : pos.mode === 'top'
              ? { top: `calc(${EDGE}px + env(safe-area-inset-top, 0px))`, left: pos.left, width: pos.width }
              : { top: pos.top, left: pos.left, width: pos.width }
          : { top: '22vh', left: Math.max(EDGE, (window.innerWidth - Math.min(330, window.innerWidth - EDGE * 2)) / 2), width: Math.min(330, window.innerWidth - EDGE * 2) }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`tour-dots ${total > 12 ? 'compact' : ''}`} role="tablist" aria-label="قدم‌های راهنما">
          {steps.map((s, i) => (
            <button
              key={s.title}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`قدم ${(i + 1).toLocaleString('fa-IR')}: ${s.title}`}
              className={`tour-dot ${i === index ? 'active' : ''}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>

        <h2 id="tour-title" className="tour-title">{step.title}</h2>
        <p className="tour-text">{step.text}</p>

        <div className="tour-actions">
          <button
            ref={primaryRef}
            type="button"
            className="tour-next"
            onClick={isLast ? onClose : next}
          >
            {isLast ? 'تمام' : 'بعدی'}
          </button>
          {!isLast && (
            <button type="button" className="tour-skip" onClick={onClose}>
              رد کردن
            </button>
          )}
        </div>

        {/* کنترل راهنماهای کادری داخل بخش‌های پنل — فقط در قدم آخر تا حباب شلوغ نشود */}
        {isLast && (
          <div className="tour-foot">
            {inlineGuidesHidden ? (
              <button type="button" className="tour-link" onClick={() => showAllSectionGuides(userId)}>
                <Ico e="👁" /> راهنماهای داخل صفحه را دوباره نشان بده
              </button>
            ) : (
              <button
                type="button"
                className="tour-link"
                onClick={() => {
                  hideAllSectionGuides(userId);
                  onClose();
                }}
              >
                <Ico e="🚫" /> دیگه راهنما نشون نده
              </button>
            )}
          </div>
        )}
      </div>

    </div>,
    document.body
  );
}
