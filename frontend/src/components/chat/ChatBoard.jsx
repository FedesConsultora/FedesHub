// /frontend/src/components/chat/ChatBoard.jsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChannels } from '../../hooks/useChat'
import ChatDesktop from './desktop/ChatDesktop'
import ChatMobile from './mobile/ChatMobile'
import './ChatBoard.scss'

const LAST_CHAT_KEY = 'fh:chat:lastId'

export default function ChatBoard({ selectedId = null }) {
  const navigate = useNavigate()
  const { data: channels } = useChannels({ scope: 'mine' })
  const [current, setCurrent] = useState(selectedId)

  // Persistir el ID seleccionado en localStorage y redirigir si no hay uno en la URL
  useEffect(() => {
    if (selectedId) {
      setCurrent(selectedId)
      localStorage.setItem(LAST_CHAT_KEY, selectedId)
    } else {
      const lastId = localStorage.getItem(LAST_CHAT_KEY)
      if (lastId && !selectedId) {
        navigate(`/chat/c/${lastId}`, { replace: true })
      }
    }
  }, [selectedId, navigate])

  const handleOpen = (id) => {
    setCurrent(id)
    navigate(`/chat/c/${id}`)
  }

  // MQ simple
  const isMobile = useMemo(() => window.matchMedia('(max-width: 880px)').matches, [])

  if (isMobile) {
    return (
      <ChatMobile
        channels={channels || []}
        currentId={current}
        onOpen={handleOpen}
      />
    )
  }
  return (
    <ChatDesktop
      channels={channels || []}
      currentId={current}
      onOpen={handleOpen}
    />
  )
}
