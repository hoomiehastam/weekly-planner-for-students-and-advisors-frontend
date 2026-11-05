// کلاینت API با جلسه‌ی مبتنی بر کوکی httpOnly:
// توکن دیگر در جاوااسکریپت ذخیره/رد نمی‌شود و با credentials='include' ارسال می‌شود.
// در تولید، VITE_API_BASE_URL آدرس بک‌اند را می‌دهد؛ در توسعه بدون مقدار، درخواست‌ها
// به همان هاست فرانت (پروکسی Vite) می‌روند.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// لینک خروج را حلقه‌ای نشده نگه می‌داریم تا از وابستگی دایره‌ای با AuthContext جلوگیری شود
export let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

// وقتی سرور با SUBSCRIPTION_EXPIRED جواب دهد (اشتراک منقضی)، فرانت با این هندلر
// کاربر را به صفحه‌ی واریز/تمدید هدایت می‌کند — جای دیگری غیر از AuthContext ثبت می‌شود.
export let onSubscriptionExpired = null;
export function setSubscriptionExpiredHandler(fn) {
  onSubscriptionExpired = fn;
}

// مهلت پاسخ: روی اینترنتِ ظاهراً وصل ولی بی‌جان، درخواست بی‌نهایت منتظر نماند و صفحه گیر نکند
const DEFAULT_TIMEOUT_MS = 20000; // خواندن
const WRITE_TIMEOUT_MS = 40000; // نوشتن (مثلاً ارسال عکس)

function makeNetworkError() {
  // قطعی اینترنت یا در دسترس نبودن سرور (نه پاسخ خطا از سرور) — پیام روشن به‌جای «Failed to fetch»
  const netErr = new Error('اتصال به اینترنت برقرار نیست');
  netErr.isNetworkError = true;
  return netErr;
}

async function request(path, { method = 'GET', body, timeoutMs } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  // دستگاه خودش می‌گوید آفلاین است؛ بی‌خود منتظر شبکه نمی‌مانیم
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw makeNetworkError();
  }

  const controller = new AbortController();
  const limit = timeoutMs || (method === 'GET' ? DEFAULT_TIMEOUT_MS : WRITE_TIMEOUT_MS);
  const timer = setTimeout(() => controller.abort(), limit);

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw makeNetworkError();
  } finally {
    clearTimeout(timer);
  }

  // پاسخ ۴۰۱ یعنی توکن نامعتبر/منقضی یا ورود لازم است؛
  // با یک بار فراخوانی هندلر، جلسه بسته و کاربر به صفحه‌ی ورود هدایت می‌شود
  if (response.status === 401) {
    onUnauthorized?.();
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // اشتراک منقضی — به‌جای خطای خام، کاربر به صفحه‌ی تمدید هدایت می‌شود
    if (response.status === 403 && data.code === 'SUBSCRIPTION_EXPIRED') {
      onSubscriptionExpired?.();
    }
    const err = new Error(data.error || 'خطایی در ارتباط با سرور رخ داد');
    err.status = response.status;
    err.code = data.code;
    throw err;
  }

  return data;
}

// --- بخش احراز هویت ---
export function login(email, password) {
  return request('/api/auth/login', { method: 'POST', body: { email, password } });
}

export function register(payload) {
  return request('/api/auth/register', { method: 'POST', body: payload });
}

export function registerInstitute(payload) {
  return request('/api/auth/register-institute', { method: 'POST', body: payload });
}

export function logoutApi() {
  return request('/api/auth/logout', { method: 'POST' });
}

export function getMe() {
  // بررسی جلسه‌ی ابتدای برنامه: مهلت کوتاه‌تر تا با اینترنت ضعیف سریع به حالت آفلاین برویم
  return request('/api/auth/me', { timeoutMs: 8000 });
}

// به‌روزرسانی پروفایل کاربر لاگین‌شده
// payload: { fullName?, phone?, bio? }
// توجه: دانش‌آموز نمی‌تواند fullName را تغییر دهد
export function updateMyProfile(payload) {
  return request('/api/auth/me', { method: 'PUT', body: payload });
}

// تنظیم/حذف عکس پروفایل — photoUrl: "data:image/..." یا null برای حذف
export function updateMyPhoto(photoUrl) {
  return request('/api/auth/me/photo', { method: 'PUT', body: { photoUrl } });
}

// تغییر رمز عبور خود کاربر (مثلاً بعد از ورود با OTP)
// payload: { currentPassword?, newPassword }
export function changeMyPassword(payload) {
  return request('/api/auth/me/password', { method: 'PUT', body: payload });
}

// درخواست بازیابی رمز عبور — لینک بازیابی به ایمیل ارسال می‌شود
export function requestPasswordReset(email) {
  return request('/api/auth/forgot-password', { method: 'POST', body: { email } });
}

// درخواست کد یک‌بارمصرف ایمیلی برای ورود بدون رمز — کد ۶ رقمی به ایمیل ارسال می‌شود
// سپس با login(email, code) می‌توان وارد شد (کد جای رمز عبور می‌نشیند)
export function requestOtpCode(email) {
  return request('/api/auth/otp/request', { method: 'POST', body: { email } });
}

// تنظیم رمز عبور جدید با توکن بازیابی
export function resetPassword(token, newPassword) {
  return request('/api/auth/reset-password', { method: 'POST', body: { token, newPassword } });
}

// اعتبارسنجی توکن بازیابی — آیا توکن معتبر است؟
export function verifyResetToken(token) {
  return request('/api/auth/verify-reset-token', { method: 'POST', body: { token } });
}

export function fetchActiveAdvisors({ instituteId, field } = {}) {
  // فیلتر اختیاری:
  //   - instituteId: فقط مشاوران همان مؤسسه (اگر ارسال نشود، فقط مستقل‌ها)
  //   - field: فقط مشاوران همان رشته (HUMANITIES / MATH_PHYSICS / EXPERIMENTAL)
  const params = new URLSearchParams();
  if (instituteId) params.set('instituteId', instituteId);
  if (field) params.set('field', field);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return request(`/api/advisors${qs}`);
}

// فهرست عمومی مؤسسه‌های فعال — برای انتخاب در فرم ثبت‌نام
export function fetchPublicInstitutes() {
  return request('/api/advisors/institutes/public');
}

// مشاور: فهرست درخواست‌های دانش‌آموزان (PENDING)
export function fetchPendingStudentRequests() {
  return request('/api/advisors/me/pending-students');
}

// مشاور: فهرست دانش‌آموزان فعال (تأییدشده)
export function fetchActiveStudents() {
  return request('/api/advisors/me/active-students');
}

// مشاور: قبول یک درخواست دانش‌آموز
export function acceptStudentRequest(linkId) {
  return request(`/api/advisors/me/requests/${linkId}/accept`, { method: 'POST' });
}

// مشاور: رد یک درخواست دانش‌آموز
export function rejectStudentRequest(linkId) {
  return request(`/api/advisors/me/requests/${linkId}/reject`, { method: 'POST' });
}

// --- بخش برنامه‌ی مطالعاتی ---
export function fetchMyPlans() {
  return request('/api/plans/mine');
}

export function fetchStudentPlans(studentId) {
  return request(`/api/plans/student/${studentId}`);
}

export function createPlan(payload) {
  return request('/api/plans', { method: 'POST', body: payload });
}

export function updatePlan(planId, payload) {
  return request(`/api/plans/${planId}`, { method: 'PUT', body: payload });
}

export function deletePlan(planId) {
  return request(`/api/plans/${planId}`, { method: 'DELETE' });
}

// --- بخش تگ‌ها ---
export function fetchTags() {
  return request('/api/tags');
}

export function createTag(name) {
  return request('/api/tags', { method: 'POST', body: { name } });
}

// --- بخش جمله‌ی انگیزشی ---
export function fetchRandomQuote() {
  return request('/api/quotes/random');
}

export function updateItemStatus(itemId, status) {
  return request(`/api/plans/items/${itemId}/status`, { method: 'PATCH', body: { status } });
}

// دانش‌آموز: ثبت دقیقه‌ی واقعی مطالعه و تعداد تست‌های زده‌شده برای یک آیتم
// payload: { actualMinutes?: number|null, testsTaken?: number|null }
export function updateItemProgress(itemId, payload) {
  return request(`/api/plans/items/${itemId}/progress`, { method: 'PATCH', body: payload });
}

// --- بخش اعلان ---
export function fetchNotificationSummary() {
  return request('/api/notifications/summary');
}

export function markNotificationSeen(type) {
  return request('/api/notifications/mark-seen', { method: 'POST', body: { type } });
}

// --- بخش یادآور ---
export function fetchMyReminders() {
  return request('/api/reminders/mine');
}

export function sendReminder(payload) {
  return request('/api/reminders', { method: 'POST', body: payload });
}

export function fetchRemindersForStudent(studentId) {
  return request(`/api/reminders/student/${studentId}`);
}

export function deleteReminder(reminderId) {
  return request(`/api/reminders/${reminderId}`, { method: 'DELETE' });
}

// --- بخش لاگ‌های per-tag برای آیتم‌های درسی ---
// دانش‌آموز برای هر تگ (یا «سایر» با tagId=null) در یک آیتم درسی، دقیقه و تعداد تست ثبت می‌کند.
// payload: { tagId?: string|null, minutes: number, testsTaken?: number|null, note?: string }
// اگر minutes=0 ارسال شود، لاگ حذف می‌شود.
export function setItemTagLog(planItemId, payload) {
  return request(`/api/plans/items/${planItemId}/tag-log`, {
    method: 'PUT',
    body: payload,
  });
}

// حذف لاگ per-tag برای یک آیتم درسی
// payload: { tagId?: string|null } — null برای حذف لاگ «سایر کارها»
export function deleteItemTagLog(planItemId, tagId) {
  return request(`/api/plans/items/${planItemId}/tag-log`, {
    method: 'DELETE',
    body: { tagId: tagId || null },
  });
}

// --- مطالعه‌ی آزاد (خارج از برنامه‌ی مشاور) و پیشروی دروس ---
export function fetchStudyTags() {
  return request('/api/study/tags');
}
export function fetchMyStudyEntries() {
  return request('/api/study/entries/mine');
}
export function createStudyEntry(payload) {
  return request('/api/study/entries', { method: 'POST', body: payload });
}
export function updateStudyEntry(id, payload) {
  return request(`/api/study/entries/${id}`, { method: 'PUT', body: payload });
}
export function deleteStudyEntry(id) {
  return request(`/api/study/entries/${id}`, { method: 'DELETE' });
}
// مشاور/والد/خود دانش‌آموز
export function fetchStudyEntriesForStudent(studentId) {
  return request(`/api/study/entries/student/${studentId}`);
}
// payload: { studyDay: 'YYYY-MM-DD', items: [{ subject, position }] }
export function saveSubjectProgress(payload) {
  return request('/api/study/progress', { method: 'PUT', body: payload });
}
export function fetchMySubjectProgress() {
  return request('/api/study/progress/mine');
}
export function fetchSubjectProgressForStudent(studentId) {
  return request(`/api/study/progress/student/${studentId}`);
}

// --- بخش دانش‌آموزهای خود مشاور ---
export function fetchMyStudents() {
  return request('/api/students/mine');
}

// --- بخش هدف هفتگی ---
// دانش‌آموز: هدف هفتگی خودش را می‌بیند
export function fetchMyWeeklyGoal() {
  return request('/api/students/me/weekly-goal');
}

// دانش‌آموز: اطلاعات مشاور خودش را می‌بیند (نام، ایمیل، شماره تماس، توضیحات)
export function fetchMyAdvisor() {
  return request('/api/students/me/advisor');
}

// مشاور: هدف هفتگی دانش‌آموز را تنظیم می‌کند (به دقیقه)
export function setStudentWeeklyGoal(studentId, weeklyGoalMinutes) {
  return request(`/api/students/${studentId}/weekly-goal`, {
    method: 'PUT',
    body: { weeklyGoalMinutes },
  });
}

// دانش‌آموز: انتخاب مشاور توسط خودش (بعد از تکمیل رشته داخل پنل)
export function chooseMyAdvisor(advisorId) {
  return request('/api/students/me/advisor', {
    method: 'POST',
    body: { advisorId },
  });
}

// --- بخش مدیریت سوپرادمین ---
export function fetchPendingAdvisors() {
  return request('/api/admin/advisors/pending');
}

export function approveAdvisor(id) {
  return request(`/api/admin/advisors/${id}/approve`, { method: 'POST' });
}

export function rejectAdvisor(id) {
  return request(`/api/admin/advisors/${id}/reject`, { method: 'POST' });
}

export function fetchAdvisorsOverview() {
  return request('/api/admin/advisors/overview');
}

// ====== سوپرادمین: مدیریت دانش‌آموزان ======
export function fetchStudentsOverview() {
  return request('/api/admin/students/overview');
}

export function deactivateStudent(studentId) {
  return request(`/api/admin/students/${studentId}/deactivate`, { method: 'POST' });
}

export function reactivateStudent(studentId) {
  return request(`/api/admin/students/${studentId}/reactivate`, { method: 'POST' });
}

export function deleteStudent(studentId) {
  return request(`/api/admin/students/${studentId}`, { method: 'DELETE' });
}

// تعیین/عزل نماینده‌ی مؤسسه — leaderId: userId یا null برای عزل
export function setInstituteLeader(instituteId, leaderId) {
  return request(`/api/admin/institutes/${instituteId}/leader`, {
    method: 'PUT',
    body: { leaderId: leaderId || null },
  });
}

// --- بخش آزمون‌ها ---

// مشاور: ساخت آزمون جدید
// payload: { title, description?, studentId, scheduledAt, durationMinutes, visibleToStudent, questions: [...] }
export function createExam(payload) {
  return request('/api/exams', { method: 'POST', body: payload });
}

// مشاور: ویرایش آزمون
export function updateExam(examId, payload) {
  return request(`/api/exams/${examId}`, { method: 'PUT', body: payload });
}

// مشاور: حذف آزمون
export function deleteExam(examId) {
  return request(`/api/exams/${examId}`, { method: 'DELETE' });
}

// مشاور: گرفتن آزمون‌های یک دانش‌آموز
export function fetchExamsForStudent(studentId) {
  return request(`/api/exams/student/${studentId}`);
}

// مشاور: گرفتن همه‌ی ارسال‌های یک آزمون
export function fetchExamSubmissions(examId) {
  return request(`/api/exams/${examId}/submissions`);
}

// مشاور: نمره‌دهی به یک ارسال
// payload: { answers?: [{ id, score }], totalScore?, feedback? }
export function gradeSubmission(submissionId, payload) {
  return request(`/api/exams/submissions/${submissionId}/grade`, {
    method: 'PUT',
    body: payload,
  });
}

// ====== مدیر مؤسسه ======
// همه‌ی این‌ها سمت سرور با instituteId از JWT اسکوپ می‌شوند
export function fetchInstituteMe() {
  return request('/api/institute/me');
}

export function fetchInstituteAdvisors() {
  return request('/api/institute/advisors');
}

export function fetchInstituteStudents() {
  return request('/api/institute/students');
}

export function approveMember(memberId) {
  return request(`/api/institute/members/${memberId}/approve`, { method: 'PUT' });
}

export function rejectMember(memberId) {
  return request(`/api/institute/members/${memberId}/reject`, { method: 'PUT' });
}

// حذف عضو از مؤسسه (مستقل می‌شود — کاربر پاک نمی‌شود)
export function removeInstituteMember(memberId) {
  return request(`/api/institute/members/${memberId}`, { method: 'DELETE' });
}

// ====== سوپرادمین: مدیریت مؤسسه‌ها ======
export function createInstitute(payload) {
  const body = typeof payload === 'string' ? { name: payload } : payload;
  return request('/api/admin/institutes', { method: 'POST', body });
}

export function fetchInstitutes() {
  return request('/api/admin/institutes');
}

export function activateInstitute(instituteId) {
  return request(`/api/admin/institutes/${instituteId}/activate`, { method: 'POST' });
}

// حذف مؤسسه — اعضا به مستقل تبدیل می‌شوند
export function deleteInstitute(instituteId) {
  return request(`/api/admin/institutes/${instituteId}`, { method: 'DELETE' });
}

// تنظیم مدت اشتراک مؤسسه — payload: { endsAt?, daysFromNow?, status? }
export function updateInstituteSubscription(instituteId, payload) {
  return request(`/api/admin/institutes/${instituteId}/subscription`, { method: 'PUT', body: payload });
}

// تخصیص مشاور به مؤسسه (یا جدا کردنش با instituteId=null)
export function assignAdvisorToInstitute(advisorId, instituteId) {
  return request(`/api/admin/advisors/${advisorId}/institute`, {
    method: 'PUT',
    body: { instituteId: instituteId || null },
  });
}

// تخصیص/ویرایش رشته‌های تخصص مشاور — fields: آرایه‌ای از رشته‌ها
export function assignAdvisorFields(advisorId, fields) {
  return request(`/api/admin/advisors/${advisorId}/fields`, {
    method: 'PUT',
    body: { fields },
  });
}

// غیرفعال‌کردن مشاور (SUSPENDED)
export function deactivateAdvisor(advisorId) {
  return request(`/api/admin/advisors/${advisorId}/deactivate`, { method: 'POST' });
}

// فعال‌کردن مجدد مشاور (ACTIVE)
export function reactivateAdvisor(advisorId) {
  return request(`/api/admin/advisors/${advisorId}/reactivate`, { method: 'POST' });
}

// حذف مشاور (hard delete — قابل بازگشت نیست)
export function deleteAdvisor(advisorId) {
  return request(`/api/admin/advisors/${advisorId}`, { method: 'DELETE' });
}

// ساخت رمز یک‌بار مصرف (OTP) برای کاربر — وقتی رمزش را فراموش کرده
// payload: { ttlHours? }
export function createUserOtp(userId, ttlHours) {
  return request(`/api/admin/users/${userId}/otp`, {
    method: 'POST',
    body: ttlHours ? { ttlHours } : {},
  });
}

// دانش‌آموز: گرفتن آزمون‌های فعال خودش
export function fetchMyExams() {
  return request('/api/exams/mine');
}

// دانش‌آموز: شروع یا از سرگیری آزمون — یک submission می‌سازد یا موجود را برمی‌گرداند
export function startExam(examId) {
  return request(`/api/exams/${examId}/start`, { method: 'POST' });
}

// دانش‌آموز: مرور پاسخ‌های آزمون ارسال‌شده (گزینه‌ی صحیح + نمره‌ی هر سؤال)
export function fetchExamReview(examId) {
  return request(`/api/exams/${examId}/review`);
}

// دانش‌آموز: ذخیره‌ی موقت یک پاسخ
// payload: { questionId, selectedOption?, textAnswer? }
export function saveExamAnswer(submissionId, payload) {
  return request(`/api/exams/submissions/${submissionId}/save`, {
    method: 'POST',
    body: payload,
  });
}

// دانش‌آموز: ارسال نهایی آزمون
export function submitExam(submissionId) {
  return request(`/api/exams/submissions/${submissionId}/submit`, {
    method: 'POST',
  });
}

// ====== اشتراک و واریز ======

// وضعیت اشتراک کاربر (فردی + مؤسسه) — حتی با اشتراک منقضی در دسترس است
export function fetchMySubscription() {
  return request('/api/subscription/me');
}

// کارت واریز خودم (مشاور مستقل / مدیر مؤسسه / سوپرادمین)
export function fetchMyCard() {
  return request('/api/subscription/me/card');
}

// تنظیم شماره کارت واریز خود کاربر (مشاور مستقل) — payload: { cardNumber, shaba?, holderName? }
export function setMyCardSettings(payload) {
  return request('/api/subscription/me/card', { method: 'PUT', body: payload });
}

// زمینه‌ی صفحه‌ی واریز: به کارت چه کسی واریز کنم و تمدیدِ چه چیزی را می‌خرم
export function fetchDepositContext() {
  return request('/api/subscription/deposit-context');
}

// ثبت رسید واریز — payload: { targetKind, targetId, receiptImageUrl, amount?, note? }
export function createDeposit(payload) {
  return request('/api/subscription/deposits', { method: 'POST', body: payload });
}

// رسیدهایی که من فرستاده‌ام (پیگیری وضعیت)
export function fetchMyDeposits() {
  return request('/api/subscription/deposits/mine');
}

// رسیدهایی که باید من تأیید کنم (مشاور/مدیر مؤسسه/سوپرادمین)
export function fetchIncomingDeposits() {
  return request('/api/subscription/deposits/incoming');
}

// تأیید رسید — payload: { days, decisionNote?, amount? }
// مدت تمدید معمولاً خودکار از مبلغ ÷ قیمت ماهانه محاسبه می‌شود؛
// amount = اصلاح مبلغ واریزی توسط تأییدکننده (اگر اشتباه وارد شده بود)
export function approveDeposit(depositId, days, decisionNote, amount) {
  return request(`/api/subscription/deposits/${depositId}/approve`, {
    method: 'POST',
    body: { days, decisionNote, amount },
  });
}

// رد رسید — payload: { decisionNote? }
export function rejectDeposit(depositId, decisionNote) {
  return request(`/api/subscription/deposits/${depositId}/reject`, {
    method: 'POST',
    body: { decisionNote },
  });
}

// ====== سوپرادمین: اشتراک و محدودیت‌ها ======

// تنظیم مبلغ ماهانه‌ی اشتراک کاربر (دانش‌آموز/مشاور) — { monthlyPrice: number|null } به تومان
export function setUserMonthlyPrice(userId, monthlyPrice) {
  return request(`/api/admin/users/${userId}/monthly-price`, {
    method: 'PUT',
    body: { monthlyPrice: monthlyPrice === null ? null : Number(monthlyPrice) },
  });
}

// تنظیم مبلغ ماهانه‌ی اشتراک مؤسسه — { monthlyPrice: number|null } به تومان
export function setInstituteMonthlyPrice(instituteId, monthlyPrice) {
  return request(`/api/admin/institutes/${instituteId}/monthly-price`, {
    method: 'PUT',
    body: { monthlyPrice: monthlyPrice === null ? null : Number(monthlyPrice) },
  });
}

// تنظیم اشتراک فردی کاربر — payload: { endsAt?, daysFromNow?, status? }
export function updateUserSubscription(userId, payload) {
  return request(`/api/admin/users/${userId}/subscription`, { method: 'PUT', body: payload });
}

// تنظیم سقف اعضای مؤسسه — payload: { maxAdvisors: number|null, maxStudents: number|null }
export function updateInstituteLimits(instituteId, payload) {
  return request(`/api/admin/institutes/${instituteId}/limits`, { method: 'PUT', body: payload });
}

// تنظیم کارت واریز مؤسسه یا پلتفرم — payload: { cardNumber, shaba?, holderName? }
export function setInstituteCard(instituteId, payload) {
  return request(`/api/admin/institutes/${instituteId}/card`, { method: 'PUT', body: payload });
}

// مدیر مؤسسه: انتخاب/تغییر مشاور یک دانش‌آموز مؤسسه — payload: { advisorId }
export function assignStudentAdvisor(studentId, advisorId) {
  return request(`/api/institute/students/${studentId}/advisor`, { method: 'PUT', body: { advisorId } });
}

// ====== تنظیمات سراسری پلتفرم ======

// ====== لاگ ممیزی (ردپای تغییرات) ======
export function fetchAuditLogs(take = 50) {
  return request(`/api/admin/audit-logs?take=${take}`);
}

// ====== پنل اولیا ======

// دانش‌آموز: ساخت کد دعوت برای والد
export function createParentInvite() {
  return request('/api/parents/invites', { method: 'POST' });
}

// دانش‌آموز: کد دعوت فعال من
export function fetchMyParentInvite() {
  return request('/api/parents/invites/mine');
}

// والد: اتصال با کد دعوت — code: 'XXXXXXXX'
export function joinAsParent(code) {
  return request('/api/parents/join', { method: 'POST', body: { code } });
}

// والد: فرزندان من
export function fetchMyChildren() {
  return request('/api/parents/children');
}

// والد: خلاصه‌ی فقط-خواندنی فرزند
export function fetchChildSummary(studentId) {
  return request(`/api/parents/children/${studentId}/summary`);
}

// تاریخ کنکور (روزشمار لندینگ) — عمومی؛ بدون نیاز به ورود
export function fetchKonkurDate() {
  return request('/api/settings/konkur-date');
}

// ====== نمرات آزمون‌های آزمایشی (MOCK) ======

// فهرست نمرات یک دانش‌آموز — دانش‌آموز برای خودش، مشاور برای دانش‌آموزهایش،
// والد برای فرزندهایش. پاسخ: { scores: [...], access: 'SELF'|'ADVISOR'|'PARENT' }
export function fetchMockExamScores(studentId) {
  return request(`/api/students/${studentId}/mock-exams`);
}

// ثبت نمره‌ی جدید — فقط خود دانش‌آموز
// payload: { title, takenAt, rank?, percentages? }
export function createMockExamScore(studentId, payload) {
  return request(`/api/students/${studentId}/mock-exams`, { method: 'POST', body: payload });
}

// ویرایش نمره — فقط خود دانش‌آموز
export function updateMockExamScore(scoreId, payload) {
  return request(`/api/mock-exams/${scoreId}`, { method: 'PUT', body: payload });
}

// حذف نمره — فقط خود دانش‌آموز
export function deleteMockExamScore(scoreId) {
  return request(`/api/mock-exams/${scoreId}`, { method: 'DELETE' });
}

// ====== برنامه‌ی امتحان‌ها و پرسش‌های مدرسه ======

// فهرست امتحان/پرسش‌های یک دانش‌آموز — خودش، مشاورش یا والدش
// پاسخ: { events: [{ id, title, kind, subject, dueAt, note }], access }
export function fetchStudentExamEvents(studentId) {
  return request(`/api/students/${studentId}/exam-events`);
}

// دانش‌آموز: ثبت مورد جدید
// payload: { title, kind: 'EXAM'|'QUIZ', subject?, dueAt, note? }
export function createMyExamEvent(payload) {
  return request('/api/students/me/exam-events', { method: 'POST', body: payload });
}

// دانش‌آموز: ویرایش مورد خودش
export function updateMyExamEvent(eventId, payload) {
  return request(`/api/students/me/exam-events/${eventId}`, { method: 'PUT', body: payload });
}

// دانش‌آموز: حذف مورد خودش
export function deleteMyExamEvent(eventId) {
  return request(`/api/students/me/exam-events/${eventId}`, { method: 'DELETE' });
}

// تعیین تاریخ کنکور — فقط سوپرادمین؛ date: 'YYYY-MM-DD'
export function setKonkurDate(date) {
  return request('/api/settings/konkur-date', { method: 'PUT', body: { date } });
}

export function setSystemCard(payload) {
  return request('/api/admin/card/system', { method: 'PUT', body: payload });
}
// ====== لینک دعوت مشاور / دعوت دوست / تخفیف ======

// عمومی: اطلاعات یک کد دعوت برای نمایش در صفحه‌ی ثبت‌نام
export function lookupInvite(code) {
  return request(`/api/invites/lookup/${encodeURIComponent(code)}`);
}

// مشاور: لینک دعوت ثابت من
export function fetchMyAdvisorInvite() {
  return request('/api/invites/advisor/me');
}

// مشاور: payload: { enabled?, referralEnabled?, regenerate? }
export function updateMyAdvisorInvite(payload) {
  return request('/api/invites/advisor/me', { method: 'PUT', body: payload });
}

// دانش‌آموز: لینک دعوت دوست + وضعیت تخفیف
export function fetchMyFriendInvite() {
  return request('/api/invites/student/me');
}

// ====== یادداشت خصوصی مشاور ======
export function fetchStudentNotes(studentId) {
  return request(`/api/students/${studentId}/notes`);
}

export function createStudentNote(studentId, content) {
  return request(`/api/students/${studentId}/notes`, { method: 'POST', body: { content } });
}

export function updateStudentNote(studentId, noteId, content) {
  return request(`/api/students/${studentId}/notes/${noteId}`, { method: 'PUT', body: { content } });
}

export function deleteStudentNote(studentId, noteId) {
  return request(`/api/students/${studentId}/notes/${noteId}`, { method: 'DELETE' });
}

// ====== پیش‌نویس برنامه از بازه‌ی امتحان‌ها ======
// payload: { studentId, from: 'ISO', to: 'ISO', eventIds?, sessionMinutes? }
export function createExamDrafts(payload) {
  return request('/api/plans/exam-drafts', { method: 'POST', body: payload });
}

// ====== سقف دانش‌آموز فعال و تخفیف (سوپرادمین / مدیر مؤسسه) ======
export function setAdvisorStudentLimit(advisorId, maxActiveStudents) {
  return request(`/api/admin/advisors/${advisorId}/student-limit`, { method: 'PUT', body: { maxActiveStudents } });
}

export function setInstituteReferralAdmin(instituteId, enabled) {
  return request(`/api/admin/institutes/${instituteId}/referral`, { method: 'PUT', body: { enabled } });
}

export function setMyInstituteReferral(enabled) {
  return request('/api/institute/referral', { method: 'PUT', body: { enabled } });
}
