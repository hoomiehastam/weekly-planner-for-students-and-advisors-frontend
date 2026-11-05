import { useRef, useState } from 'react';
import { updateMyProfile, updateMyPhoto, changeMyPassword } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { toFaDigits } from '../utils/jalali';
import Ico from './Ico';

// مودال ویرایش پروفایل کاربر
// محدودیت‌ها:
//   - دانش‌آموز (STUDENT): فقط شماره تماس و توضیحات قابل ویرایش است (نام قفل است)
//   - مشاور و سوپرادمین: نام، شماره تماس و توضیحات قابل ویرایش است
//   - همه: عکس پروفایل (اختیاری) و تغییر رمز عبور داوطلبانه
//
// عکس قبل از ارسال در مرورگر کوچک می‌شود (canvas تا ۲۵۶px) تا از سقف ۵۰۰KB مطمئن شویم.

const MAX_DIMENSION = 256;

// خواندن فایل عکس، کوچک‌کردن آن با canvas و تبدیل به data URL
function fileToResizedDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('فایل انتخاب‌شده عکس نیست'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('خواندن فایل ناموفق بود'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('عکس قابل خواندن نیست'));
      img.onload = () => {
        // کوچک‌سازی متناسب تا حداکثر ۲۵۶ پیکسل در بزرگ‌ترین بعد
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        // اول پس‌زمینه‌ی سفید (JPEG شفافیت ندارد و بدون این، پس‌زمینه سیاه می‌شود)، بعد عکس
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function ProfileModal({ onClose }) {
  const { auth, updateUser } = useAuth();
  const toast = useToast();
  const user = auth.user;

  const [fullName, setFullName] = useState(user.fullName || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [bio, setBio] = useState(user.bio || '');
  const [photoUrl, setPhotoUrl] = useState(user.photoUrl || null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // بخش تغییر رمز — پیش‌فرض جمع است؛ باز شدنش یعنی کاربر می‌خواهد رمزش را عوض کند
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const isStudent = user.role === 'STUDENT';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const payload = {};
      // فقط اگر کاربر مشاور/سوپرادمین باشد، نام ارسال می‌شود
      if (!isStudent && fullName.trim() !== user.fullName) {
        payload.fullName = fullName.trim();
      }
      // phone و bio همیشه قابل ویرایش هستند
      if (phone !== (user.phone || '')) {
        payload.phone = phone;
      }
      if (bio !== (user.bio || '')) {
        payload.bio = bio;
      }

      if (Object.keys(payload).length > 0) {
        const data = await updateMyProfile(payload);
        updateUser(data.user);
      }

      setSuccess('پروفایل به‌روزرسانی شد');

      // بستن مودال پس از ۱.۵ ثانیه
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // انتخاب عکس از دیسک → کوچک‌سازی → آپلود فوری (بدون نیاز به دکمه ذخیره)
  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // اجازه‌ی انتخاب دوباره‌ی همان فایل
    if (!file) return;

    setError('');
    setUploadingPhoto(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      const res = await updateMyPhoto(dataUrl);
      setPhotoUrl(res.photoUrl);
      updateUser({ photoUrl: res.photoUrl });
      toast.success(res.message || 'عکس پروفایل به‌روزرسانی شد');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  // حذف عکس پروفایل
  async function handlePhotoRemove() {
    setUploadingPhoto(true);
    try {
      await updateMyPhoto(null);
      setPhotoUrl(null);
      updateUser({ photoUrl: null });
      toast.success('عکس پروفایل حذف شد');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  // تغییر رمز عبور داوطلبانه — currentPassword لازم است (مگر در حالت OTP که این فرم باز نمی‌شود)
  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (!auth.mustChangePassword && !currentPassword) {
      setPwError('رمز عبور فعلی الزامی است');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('رمز عبور جدید و تکرارش یکسان نیستند');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('رمز عبور باید حداقل ۸ کاراکتر باشد');
      return;
    }

    setSavingPw(true);
    try {
      const payload = { newPassword };
      if (!auth.mustChangePassword) payload.currentPassword = currentPassword;
      const res = await changeMyPassword(payload);
      setPwSuccess(res.message || 'رمز عبور تغییر کرد');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwError(err.message);
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-modal-head">
          <h3>
            <span aria-hidden><Ico e="👤" /></span> ویرایش پروفایل
          </h3>
          <button className="btn-icon-only" onClick={onClose} aria-label="بستن">
            <Ico e="✕" />
          </button>
        </div>

        {/* --- عکس پروفایل --- */}
        <div className="profile-photo-block" data-tour="pf-photo">
          <div className="profile-photo-wrap">
            {photoUrl ? (
              <img src={photoUrl} alt="عکس پروفایل" className="profile-photo-img" />
            ) : (
              <div className="profile-avatar-big">
                {(user.fullName || '؟').charAt(0)}
              </div>
            )}
            {uploadingPhoto && <div className="profile-photo-loading"><div className="spinner" /></div>}
          </div>
          <div className="profile-photo-actions">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
            >
              <Ico e="📷" /> {photoUrl ? 'تغییر عکس' : 'انتخاب عکس'}
            </button>
            {photoUrl && (
              <button
                type="button"
                className="btn-secondary btn-sm btn-danger"
                onClick={handlePhotoRemove}
                disabled={uploadingPhoto}
              >
                <Ico e="🗑" /> حذف عکس
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
              aria-label="انتخاب عکس پروفایل"
            />
            <span className="field-hint">اختیاری — حداکثر ۵ مگابایت، به‌خودکار کوچک می‌شود</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          {/* نام کامل — برای دانش‌آموز قفل است */}
          <label className="field-label" data-tour="pf-name">
            نام کامل
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isStudent}
              maxLength={100}
              placeholder="نام و نام خانوادگی"
            />
            {isStudent && (
              <span className="field-hint warning-hint">
                <Ico e="🔒" /> تغییر نام برای دانش‌آموز غیرفعال است. در صورت نیاز با مشاور یا سوپرادمین تماس بگیرید.
              </span>
            )}
          </label>

          {/* ایمیل — فقط خواندنی */}
          <label className="field-label" data-tour="pf-email">
            ایمیل
            <input
              type="email"
              value={user.email}
              disabled
              dir="ltr"
            />
            <span className="field-hint">ایمیل قابل تغییر نیست.</span>
          </label>

          {/* شماره تماس */}
          <label className="field-label" data-tour="pf-phone">
            شماره تماس
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
              placeholder="مثلاً ۰۹۱۲۳۴۵۶۷۸۹"
            />
            <span className="field-hint">
              فرمت‌های قابل قبول: ۰۹۱۲۳۴۵۶۷۸۹، +۹۸۹۱۲۳۴۵۶۷۸۹، ۰۰۹۸۹۱۲۳۴۵۶۷۸۹
            </span>
          </label>

          {/* توضیحات */}
          <label className="field-label" data-tour="pf-bio">
            {isStudent ? 'توضیحات (اختیاری)' : 'توضیحات درباره‌ی شما'}
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={
                isStudent
                  ? 'مثلاً: رشته‌ی تجربی، پایه‌ی دوازدهم، هدف کنکور ۱۴۰۴…'
                  : 'مثلاً: مدرس ریاضی با ۱۰ سال سابقه، فارغ‌التحصیل دانشگاه تهران…'
              }
            />
            <span className="field-hint">
              {toFaDigits(bio.length)} / ۵۰۰ کاراکتر
            </span>
          </label>

          {error && (
            <div className="alert alert-error">
              <span><Ico e="⚠" /></span> {error}
            </div>
          )}
          {success && (
            <div className="alert alert-success">
              <span><Ico e="✓" /></span> {success}
            </div>
          )}

          <div className="profile-form-actions" data-tour="pf-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'در حال ذخیره…' : <><Ico e="💾" /> ذخیره تغییرات</>}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              انصراف
            </button>
          </div>
        </form>

        {/* --- تغییر رمز عبور --- */}
        <div className="profile-password-section" data-tour="pf-password">
          {!showPasswordForm ? (
            <button
              type="button"
              className="btn-secondary btn-block"
              onClick={() => setShowPasswordForm(true)}
            >
              <Ico e="🔑" /> تغییر رمز عبور
            </button>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="profile-form">
              <div className="profile-password-head">
                <strong><Ico e="🔑" /> تغییر رمز عبور</strong>
                <button
                  type="button"
                  className="btn-icon-only"
                  onClick={() => { setShowPasswordForm(false); setPwError(''); setPwSuccess(''); }}
                  aria-label="بستن بخش تغییر رمز"
                >
                  <Ico e="✕" />
                </button>
              </div>

              {!auth.mustChangePassword && (
                <label className="field-label">
                  رمز عبور فعلی
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </label>
              )}

              <label className="field-label">
                رمز عبور جدید
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="حداقل ۸ کاراکتر، شامل حرف و عدد"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>

              <label className="field-label">
                تکرار رمز عبور جدید
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="رمز جدید را دوباره وارد کنید"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>

              {pwError && (
                <div className="alert alert-error">
                  <span><Ico e="⚠" /></span> {pwError}
                </div>
              )}
              {pwSuccess && (
                <div className="alert alert-success">
                  <span><Ico e="✓" /></span> {pwSuccess}
                </div>
              )}

              <button type="submit" className="btn-primary btn-block" disabled={savingPw}>
                {savingPw ? 'در حال ذخیره…' : <><Ico e="✓" /> ذخیره‌ی رمز جدید</>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
