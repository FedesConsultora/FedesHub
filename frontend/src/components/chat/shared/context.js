// src/components/chat/shared/context.js
import { createContext } from 'react'

export const ChatActionCtx = createContext({
  replyTo: null,
  setReplyTo: () => {}
})
