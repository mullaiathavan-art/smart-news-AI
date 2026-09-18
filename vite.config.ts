import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load environment variables from .env files
  const env = loadEnv(mode, process['cwd'](), '');

  const rawKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || process.env.API_KEY || env.API_KEY || '';
  const isPlaceholder = !rawKey || rawKey === 'your_gemini_api_key_here' || rawKey.includes('your_');
  const resolvedKey = isPlaceholder ? '' : rawKey;

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(resolvedKey),
      'process.env.GEMINI_API_KEY': JSON.stringify(resolvedKey),
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
    }
  };
});