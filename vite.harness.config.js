// کانفیگ موقت و جداگانه برای «هارنس بررسی UI» — به vite.config.js اصلی دست نمی‌زند.
// فقط برای اینکه بشود کارت را در عرض گوشی دید و اسکرین‌شات گرفت.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: { allow: ['..'] },
  },
});
