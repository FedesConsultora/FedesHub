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
  const body  = payload?.notification?.body  || ''
  const data  = payload?.data || {}

  await self.registration.showNotification(title, {
    body,
    data,
    icon: '/favicon.ico',
    badge: '/favicon.ico'
  })

  // Eco a todas las ventanas abiertas (tiempo real in-app)
  const clientsList = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
  clientsList.forEach(c => c.postMessage({ type: 'fh:push', data }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification?.data?.link_url || '/notificaciones'
  event.waitUntil(self.clients.openWindow(url))
})
