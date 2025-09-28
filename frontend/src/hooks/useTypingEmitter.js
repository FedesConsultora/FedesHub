import { useRef, useEffect, useCallback } from 'react'
import { useTyping } from './useChat'

/**
 * const typing = useTypingEmitter(canal_id, { my_user_id, throttleMs:2000, ttl:5, debugSelf:true })
 * on input: typing.ping()
 * on blur / unmount: typing.stop()
 */
export function useTypingEmitter(
  canal_id,
  { my_user_id=null, throttleMs=2000, ttl=5, debugSelf = process.env.NODE_ENV !== 'production' } = {}
) {
  const mut = useTyping()
  const st = useRef({ last:0, on:false })

  const ping = useCallback(() => {
    const now = Date.now()
    if (!canal_id) return
    if (now - st.current.last < throttleMs) return
    st.current.last = now
    st.current.on = true
    console.log('[typing][emit] -> on:true', { canal_id, ttl, at: new Date().toISOString() })

    // server
    mut.mutate({ canal_id, on:true, ttl_seconds: ttl })

    // eco local (sólo dev) para poder probar en una sola pestaña
    if (debugSelf && my_user_id) {
      console.log('[typing][local-echo] fh:typing-local on:true', { canal_id, my_user_id })
      window.dispatchEvent(new CustomEvent('fh:typing-local', {
        detail: { canal_id, user_id: Number(my_user_id), on: true, ttl_seconds: ttl }
      }))
    }
  }, [canal_id, throttleMs, ttl, mut, debugSelf, my_user_id])

  const stop = useCallback(() => {
    if (!canal_id || !st.current.on) return
    st.current.on = false
    console.log('[typing][emit] -> on:false', { canal_id, at: new Date().toISOString() })
    // server
    mut.mutate({ canal_id, on:false })
    // eco local (sólo dev)
    if (debugSelf && my_user_id) {
      console.log('[typing][local-echo] fh:typing-local on:false', { canal_id, my_user_id })
      window.dispatchEvent(new CustomEvent('fh:typing-local', {
        detail: { canal_id, user_id: Number(my_user_id), on: false }
      }))
    }
  }, [canal_id, mut, debugSelf, my_user_id])

  useEffect(() => stop, [stop])

  return { ping, stop }
}