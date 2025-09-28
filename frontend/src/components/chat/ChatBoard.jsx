// /frontend/src/components/chat/ChatBoard.jsx
import { useEffect, useMemo, useState } from 'react'
import { useChannels } from '../../hooks/useChat'
import ChatDesktop from './desktop/ChatDesktop'
import ChatMobile from './mobile/ChatMobile'
import './ChatBoard.scss'

export default function ChatBoard({ selectedId=null }) {
  const { data: channels } = useChannels({ scope:'mine' }) 
  const [current, setCurrent] = useState(selectedId)

  useEffect(()=>{ if (selectedId) setCurrent(selectedId) }, [selectedId])

  // MQ simple
  const isMobile = useMemo(()=> window.matchMedia('(max-width: 880px)').matches, [])

  if (isMobile) {
    return (
      <ChatMobile
        channels={channels || []}
        currentId={current}
        onOpen={(id)=> setCurrent(id)}
      />
    )
  }
  return (
    <ChatDesktop
      channels={channels || []}
      currentId={current}
      onOpen={(id)=> setCurrent(id)}
    />
  )
}
