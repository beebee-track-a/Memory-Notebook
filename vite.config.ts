import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const apiKey =
      env.VITE_GEMINI_API_KEY ||
      env.VITE_API_KEY ||
      env.GEMINI_API_KEY ||
      env.API_KEY;

    // Check if HTTPS is enabled via environment variable
    const useHttps = process.env.VITE_HTTPS === 'true';

    if (apiKey) {
      console.log('✅ API Key found:', apiKey.substring(0, 10) + '...');
    } else {
      console.warn('⚠️  WARNING: No API Key found in environment configuration.');
    }

    console.log(`🔒 HTTPS: ${useHttps ? 'enabled' : 'disabled'}`);

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: useHttps ? [react(), basicSsl()] : [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(apiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(apiKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
