import React, { useState, useEffect, useMemo, useRef } from 'react'
import { FiX, FiMessageSquare, FiMinus, FiMaximize2 } from 'react-icons/fi'
import { useMessages, useChannelMembers } from '../../../hooks/useChat'
import { useRealtime } from '../../../realtime/RealtimeProvider'
import { useAuthCtx } from '../../../context/AuthContext'
import Timeline from './Timeline'
import Composer from './Composer'
import PinnedBar from './PinnedBar'
import TypingIndicator from './TypingIndicator'
import { ChatActionCtx } from './context'
import GlobalLoader from '../../loader/GlobalLoader'
import { displayName } from '../../../utils/people'
import './QuickChatModal.scss'

export default function QuickChatInstance({
    canal,
    canal_id,
    initialPos,
    isMinimized: initialMinimized = false,
    zIndex = 10005,
    onClose,
    onFocus
}) {
    const [replyTo, setReplyTo] = useState(null)
    const [isMinimized, setIsMinimized] = useState(initialMinimized)
    const [pos, setPos] = useState(initialPos || { x: window.innerWidth - 450, y: window.innerHeight - 550 })

    const isDragging = useRef(false)
    const offset = useRef({ x: 0, y: 0 })

    const { user } = useAuthCtx()
    const myId = user?.id
    const { clearUnreadFor, setCurrentCanal } = useRealtime()

    const msgs = useMessages(canal_id, { limit: 30 })
    const { data: membersFull = [] } = useChannelMembers(canal_id)

    useEffect(() => {
        if (canal_id && !isMinimized) {
            setCurrentCanal(canal_id)
            clearUnreadFor(canal_id)
        }
    }, [canal_id, isMinimized, setCurrentCanal, clearUnreadFor])

    const handleMouseDown = (e) => {
        onFocus?.()
        if (e.target.closest('.no-drag')) return
        isDragging.current = true
        offset.current = {
            x: e.clientX - pos.x,
            y: e.clientY - pos.y
        }
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
    }

    const handleMouseMove = (e) => {
        if (!isDragging.current) return
        setPos({
            x: e.clientX - offset.current.x,
            y: e.clientY - offset.current.y
        })
    }

    const handleMouseUp = () => {
        isDragging.current = false
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
    }

    const chatTitle = useMemo(() => {
        if (!canal) return 'Cargando...'
        if (canal.tipo?.codigo !== 'dm') return canal.nombre || 'Canal'

        const other = membersFull.find(m => Number(m.user_id || m.id) !== myId)
        if (other) return displayName(other) || canal.nombre

        const embeddedOther = canal.members?.find(m => Number(m.user_id || m.id) !== myId)
        if (embeddedOther) return displayName(embeddedOther) || canal.nombre

        return canal.nombre || 'Chat'
    }, [canal, membersFull, myId])

    return (
        <div
            className={`quickChatModal ${isMinimized ? 'minimized' : ''}`}
            style={{ left: pos.x, top: pos.y, position: 'fixed', zIndex }}
            onMouseDown={handleMouseDown}
        >
            <header className="qcHeader">
                <div className="left">
                    <FiMessageSquare className="mainIcon" />
                    <span className="ttl">{chatTitle}</span>
                </div>
                <div className="qcActions no-drag">
                    <button className="minBtn" onClick={() => setIsMinimized(!isMinimized)} title={isMinimized ? "Expandir" : "Minimizar"}>
                        {isMinimized ? <FiMaximize2 /> : <FiMinus style={{ fontSize: '1.2rem' }} />}
                    </button>
                    <button className="closeBtn" onClick={onClose} title="Cerrar">
                        <FiX />
                    </button>
                </div>
            </header>

            {!isMinimized && (
                <main className="qcBody">
                    <div className="chatView">
                        <ChatActionCtx.Provider value={{ replyTo, setReplyTo }}>
                            <PinnedBar canal_id={canal_id} compact />
                            <div className="timelineWrap">
                                <GlobalLoader isLoading={msgs.isLoading} size={40} />
                                <Timeline
                                    rows={msgs.data || []}
                                    loading={msgs.isLoading}
                                    canal_id={canal_id}
                                    my_user_id={myId}
                                    members={membersFull}
                                    canReply={true}
                                    canPin={false}
                                />
                            </div>
                            <div className="composerWrap">
                                <TypingIndicator canal_id={canal_id} my_user_id={myId} members={membersFull} />
                                <Composer canal={canal} canal_id={canal_id} autoFocus />
                            </div>
                        </ChatActionCtx.Provider>
                    </div>
                </main>
            )}
        </div>
    )
}
