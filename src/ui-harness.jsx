// هارنس آزمایشی UI — فقط برای بررسی چیدمان کارت «امتحان‌ها و پرسش‌ها» در عرض گوشی.
// از خودِ کامپوننت واقعی و همان فایل‌های CSS استفاده می‌کند و فقط fetch را جعل می‌کند.
import ReactDOM from 'react-dom/client';
import { ToastProvider } from './context/ToastContext.jsx';
import ExamScheduleCard from './components/student/ExamScheduleCard.jsx';
import '@tabler/icons-webfont/dist/tabler-icons.min.css';
import './styles/global.css';
import './styles/theme-v2.css';
import './styles/extras.css';

function ymd(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

const EVENTS = [
  {
    id: 'e1',
    title: 'امتحان ریاضی نوبت اول',
    kind: 'EXAM',
    subject: 'ریاضی ۲',
    dueAt: ymd(0),
    note: 'فصل ۱ تا ۴ — نمره‌دار',
  },
  {
    id: 'e2',
    title: 'پرسش کلاسی شیمی',
    kind: 'QUIZ',
    subject: 'شیمی ۲',
    dueAt: ymd(1),
    note: null,
  },
  {
    id: 'e3',
    title: 'امتحان تستی و دشوارِ ادبیات فارسی با عنوان بسیار طولانی برای سنجش شکستن خط',
    kind: 'EXAM',
    subject: 'ادبیات فارسی ۲',
    dueAt: ymd(6),
    note: 'از فصل اول تا پایان فصل هفتم؛ همراه با قرابت معنایی و آرایه‌های ادبی — نمره‌دار و تأثیرگذار در معدل نهایی سال',
  },
  { id: 'e4', title: 'امتحان فیزیک', kind: 'EXAM', subject: 'فیزیک ۲', dueAt: ymd(-3), note: null },
  { id: 'e5', title: 'پرسش زبان انگلیسی', kind: 'QUIZ', subject: null, dueAt: ymd(-9), note: null },
];

const params = new URLSearchParams(window.location.search);
const mode = params.get('mode') || 'edit';

// پاسخ جعلی برای همان درخواست‌هایی که api/client.js می‌زند
const originalFetch = window.fetch;
window.fetch = async (url, opts) => {
  const u = String(url);
  if (u.includes('/exam-events')) {
    const method = (opts && opts.method) || 'GET';
    // mode=error → شبیه‌سازی خطای سرور در ثبت تا بشود محل نمایش خطا را دید
    if (params.get('error') === '1' && method !== 'GET') {
      return new Response(JSON.stringify({ error: 'عنوان امتحان یا پرسش الزامی است' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const payload =
      mode === 'readonly'
        ? { events: EVENTS, access: 'ADVISOR' }
        : { events: EVENTS, access: 'SELF' };
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return originalFetch(url, opts);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <ToastProvider>
    <div className="app-shell" style={{ padding: 12, maxWidth: 760, margin: '0 auto' }}>
      <ExamScheduleCard studentId="demo-student" canEdit={mode === 'edit'} compact={false} />
    </div>
  </ToastProvider>
);
