// /frontend/src/push/fcm.js
import { notifApi } from '../api/notificaciones'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let messaging, firebaseApp

export async function initFCM() {
  const { initializeApp } = await import('firebase/app')
  const { getMessaging, isSupported, getToken, onMessage } = await import('firebase/messaging')

  if (!await isSupported()) return null

  firebaseApp = initializeApp(firebaseConfig)
  messaging = getMessaging(firebaseApp)

  // Solicitar permisos de notificación (esencial para el sistema híbrido)
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    try {
      const perm = await Notification.requestPermission()
      console.log('[Notification] Permission:', perm)
    } catch (e) {
      console.warn('[Notification] Request failed:', e)
    }
  }

  if ('serviceWorker' in navigator) {
    // Registrar y ESPERAR a que el SW esté activo
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
    await navigator.serviceWorker.ready

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: reg })
      .catch(err => { console.error('[FCM getToken] ', err); return null })

    if (token) {
      localStorage.setItem('fh:push:token', token)
      try {
        const r = await notifApi.registerPushToken(token, 'web', navigator.userAgent)
        console.log('[FCM] token registrado', r)
      } catch (e) {
        console.log('[FCM] token registro falló (se reintenta post-login)', e?.message || e)
      }
    }

    onMessage(messaging, (payload) => {
      console.log('[FCM] onMessage', payload)
      const data = payload?.data || {}
      const notification = payload?.notification || {}
      const detail = {
        ...data,
        fcm_title: notification.title,
        fcm_body: notification.body,
        fcm_icon: notification.icon || notification.image || data.author_avatar || data.fcm_icon || data.avatar_url,
        __src: 'fcm:onMessage',
        __fcmId: payload?.messageId || data?.message_id || data?.notificacion_id
      }
      window.dispatchEvent(new CustomEvent('fh:push', { detail }))
    })

    navigator.serviceWorker.addEventListener('message', (e) => {
      // 1. Recepción de Push (desde SW a UI)
      if (e?.data?.type === 'fh:push') {
        const payload = e.data || {}
        const data = payload.data || {}
        const notification = payload.notification || {}
        console.log('[FCM] mensaje rico desde SW', payload)

        const detail = {
          ...data,
          fcm_title: notification?.title,
          fcm_body: notification?.body,
          fcm_icon: notification?.icon || notification?.image,
          __src: 'fcm:sw',
          __fcmId: e.data.messageId || data?.message_id || data?.notificacion_id
        }
        window.dispatchEvent(new CustomEvent('fh:push', { detail }))
      }

      // 2. Depuración: Ack desde SW (Confirmación de recepción de orden)
      if (e?.data?.type === 'fh:sw_ack') {
        console.log('[SW] ✅ Confirmación de orden recibida por el Worker:', e.data.title)
      }
    })

    // Log de estado del controlador
    if (navigator.serviceWorker.controller) {
      console.log('[SW] Page controlled by:', navigator.serviceWorker.controller.scriptURL)
    } else {
      console.warn('[SW] Page NOT controlled. postMessage may fail.')
    }
  }

  return messaging
}

export async function registerStoredPushToken() {
  const token = localStorage.getItem('fh:push:token')
  if (!token) return
  try {
    const r = await notifApi.registerPushToken(token, 'web', navigator.userAgent)
    console.log('[FCM] re-registro post-login', r)
  } catch (e) {
    console.log('[FCM] re-registro post-login falló', e?.message || e)
  }
}
