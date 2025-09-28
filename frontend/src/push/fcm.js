// /frontend/src/push/fcm.js
import { notifApi } from '../api/notificaciones'

const firebaseConfig = {
  apiKey:             import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:         import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:          import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId:  import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:              import.meta.env.VITE_FIREBASE_APP_ID,
}

let messaging, firebaseApp

export async function initFCM() {
  const { initializeApp } = await import('firebase/app')
  const { getMessaging, isSupported, getToken, onMessage } = await import('firebase/messaging')

  if (!await isSupported()) return null

  firebaseApp = initializeApp(firebaseConfig)
  messaging = getMessaging(firebaseApp)

  if (Notification.permission === 'default') {
    try { await Notification.requestPermission() } catch {}
  }

  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js')

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
      const detail = { ...data, __src:'fcm:onMessage', __fcmId: payload?.messageId || data?.message_id || data?.notificacion_id }
      window.dispatchEvent(new CustomEvent('fh:push', { detail }))
    })

    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e?.data?.type === 'fh:push') {
        const data = e.data.data || {}
        console.log('[FCM] mensaje desde SW', data)
        const detail = { ...data, __src:'fcm:sw', __fcmId: e.data.messageId || data?.message_id || data?.notificacion_id }
        window.dispatchEvent(new CustomEvent('fh:push', { detail }))
      }
    })
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
