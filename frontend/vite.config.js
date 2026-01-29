import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development'

  const target =
    process.env.VITE_PROXY_TARGET
    || (process.env.DOCKER === 'true'
      ? 'http://fedes-hub:4000'
      : 'http://localhost:4000')

  return {
    plugins: [react()],

    server: {
      host: true,
      port: 5173,

      // solo necesario cuando accedés por dominio público
      ...(isDev ? {} : {
        allowedHosts: [
          'hub.fedes.ai',
          'www.hub.fedes.ai',
          'fedes.ai',
          'www.fedes.ai'
        ]
      }),

      // 🔥 HMR: DEV vs PROD
      ...(isDev
        ? {
          hmr: {
            protocol: 'ws',
            host: 'localhost',
            clientPort: 3000
          }
        }
        : {
          hmr: {
            host: 'hub.fedes.ai',
            clientPort: 443,
            protocol: 'wss'
          }
        }
      ),

      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          secure: false,
        },
        '/uploads': { target, changeOrigin: true, secure: false },
        '/avatars': { target, changeOrigin: true, secure: false },
      },

      watch: {
        usePolling: true,
        interval: 150,
        awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
        ignored: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/backend/**']
      },
    },

    css: {
      preprocessorOptions: {
        scss: { api: 'modern' }
      }
    }
  }
})
