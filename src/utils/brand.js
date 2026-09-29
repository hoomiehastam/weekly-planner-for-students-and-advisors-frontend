// برندینگ پلتفرم — دو زیربرند در یک هاست:
//   «دانش‌آموزینو»  → پنل دانش‌آموز (route: /student)
//   «مشاور دانش‌آموزینو»      → پنل مشاور (route: /advisor)
// هر دو بخش از یک پلتفرم مشترک استفاده می‌کنند؛ نام مادر فقط در جاهای عمومی به‌کار می‌رود.
export const MASTER_BRAND = 'پلتفرم برنامه‌ریزی کنکور';

export const BRANDS = {
  STUDENT: {
    name: 'دانش‌آموزینو',
    mark: 'د',
    tagline: 'برنامه‌ات را بگیر، انجامش بده، پیشرفتت را ببین.',
  },
  ADVISOR: {
    name: 'مشاور دانش‌آموزینو',
    mark: 'م',
    tagline: 'کل کلاست را از یک پنل مدیریت کن.',
  },
  PARENT: {
    name: 'پنل والدین',
    mark: 'و',
    tagline: 'پیشرفت فرزندت را از نزدیک دنبال کن.',
  },
};

export function brandForRole(role) {
  if (role === 'ADVISOR' || role === 'SUPERADMIN') return BRANDS.ADVISOR;
  if (role === 'PARENT') return BRANDS.PARENT;
  return BRANDS.STUDENT;
}
