import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load environment variables from .env files
  // Fix: Use bracket notation for cwd() to avoid TypeScript error where the process type definition in the current environment is missing the method.
  const env = loadEnv(mode, process['cwd'](), '');

  return {
    plugins: [react()],
    define: {
      // Prioritize the environment variable (Netlify) then the .env file (Local)
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY || ''),
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', '@google/genai'],
          },
        },
      },
    },
    server: {
      port: 5173,
      strictPort: true,
    }
  };
});