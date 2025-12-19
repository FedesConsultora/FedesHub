// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const target =
  process.env.VITE_PROXY_TARGET
  || (process.env.DOCKER === 'true' ? 'http://fedes-hub:4000' : 'http://localhost:4000')

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,

    // 👇 habilitá tus dominios públicos
    allowedHosts: ['hub.fedes.ai', 'www.hub.fedes.ai', 'fedes.ai', 'www.fedes.ai'],

    // 👇 HMR detrás de proxy TLS (Apache termina HTTPS)
    hmr: {
      host: 'hub.fedes.ai',
      clientPort: 443,
      protocol: 'wss'
    },

    proxy: {
      '/api': {
        target,
        changeOrigin: true,
        secure: false,
        configure(proxy) {
          proxy.on('error', (err, req) => {
            console.log('[proxy:error]', req.method, req.url, '->', target, '\n', err?.message)
          })
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('[proxy:req]', req.method, req.url, '->', target)
          })
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('[proxy:res]', proxyRes.statusCode, req.method, req.url)
          })
        }
      },
      '/uploads': { target, changeOrigin: true, secure: false },
      '/avatars': { target, changeOrigin: true, secure: false },
    },

    watch: {
      usePolling: true,
      interval: 150,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
    },
  },
  css: { preprocessorOptions: { scss: { api: 'modern' } } },
})
