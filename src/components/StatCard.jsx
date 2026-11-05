import Ico from './Ico';
// کارت آمار بالای داشبوردها — سبک کانسپت: برچسب کوچک بالا، عدد درشت پایین
// (accent فقط رنگ نوار باریک لبه را تعیین می‌کند)
export default function StatCard({ icon, label, value, accent }) {
  return (
    <div className={`stat-card stat-${accent}`}>
      <div className="stat-icon" aria-hidden>{typeof icon === 'string' ? <Ico e={icon} /> : icon}</div>
      <div className="stat-body">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
      </div>
    </div>
  );
}
