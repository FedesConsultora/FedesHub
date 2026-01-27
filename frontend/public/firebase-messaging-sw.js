/* public/firebase-messaging-sw.js */
/* global importScripts, firebase */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

// ⚠️ Para el SW usá la **config web completa** (esto es público y NO es el service account)
firebase.initializeApp({
  apiKey: 'AIzaSyAE47xtqkguajHH8xYsrGvW2gWoi6ivhHQ',
  authDomain: 'fedeshub-3c7a1.firebaseapp.com',
  projectId: 'fedeshub-3c7a1',
  messagingSenderId: '1057184980511',
  appId: '1:1057184980511:web:2ef6586c29fcda5d943f2a',
})

const messaging = firebase.messaging()

// Forzá que el nuevo SW tome control sin esperar
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

messaging.onBackgroundMessage(async (payload) => {
  const title = payload?.notification?.title || 'FedesHub'
  const body = payload?.notification?.body || ''
  const data = payload?.data || {}

  // Eco a todas las ventanas abiertas (tiempo real in-app)
  const clientsList = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
  const anyFocused = clientsList.some(c => c.focused)

  // Solo mostramos banner de background si NO hay ninguna ventana en foco
  if (!anyFocused) {
    // Intentar sacar icono del payload o data
    const icon = payload?.notification?.icon || payload?.notification?.image || data?.fcm_icon || data?.author_avatar || data?.avatar_url || '/favicon.ico'

    await self.registration.showNotification(title, {
      body,
      data,
      icon,
      badge: '/favicon.ico',
      vibrate: [200, 100, 200], // Vibración en móviles
      requireInteraction: false,
      silent: true // 🔊 SIEMPRE SILENCIO: La app (si está viva) pitará.
    })
  }

  clientsList.forEach(c => c.postMessage({
    type: 'fh:push',
    data,
    notification: payload?.notification,
    messageId: payload?.messageId
  }))
})

// 🚀 Listener para delegación de notificaciones desde el hilo principal
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'fh:show_notification') {
    const { title, options } = event.data

    // Confirmar recepción al cliente para depuración
    event.source?.postMessage({ type: 'fh:sw_ack', title })

    event.waitUntil((async () => {
      try {
        // En Lv1 (sin tag en RealtimeProvider), options.tag será undefined o no colisionará
        if (options.tag) {
          const currentNotifs = await self.registration.getNotifications({ tag: options.tag })
          currentNotifs.forEach(n => n.close())
        }

        await self.registration.showNotification(title, {
          ...options,
          silent: options.silent !== undefined ? options.silent : true,
          renotify: !!options.tag
        })
      } catch (err) {
        console.error('[SW] Notification Error:', err)
      }
    })())
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification?.data?.link_url || '/notificaciones'
  event.waitUntil(self.clients.openWindow(url))
})
