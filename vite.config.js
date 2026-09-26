import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // اجازه‌ی خواندن shared/ خارج از root پنل فرانت
    fs: {
      allow: ['..'],
    },
    // پروکسی /api در حالت توسعه تا درخواست‌ها از همان origin ارسال شوند
    // و کوکی‌های SameSite=Lax در مرورگر فرستاده شوند.
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
