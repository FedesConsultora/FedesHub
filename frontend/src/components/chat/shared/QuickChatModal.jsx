import React, { useState, useEffect, useCallback } from 'react'
import { useChannels } from '../../../hooks/useChat'
import QuickChatInstance from './QuickChatInstance'

const BASE_Z_INDEX = 10005
const CASCADE_OFFSET = 30

export default function QuickChatModal() {
    const [activeChats, setActiveChats] = useState([])
    const { data: channels = [] } = useChannels({ scope: 'mine', include_archivados: false })

    const spawnChat = useCallback((canal_id) => {
        const id = Number(canal_id)
        if (!id) return

        setActiveChats(prev => {
            const existing = prev.find(c => c.canal_id === id)
            if (existing) {
                // Si ya existe, lo traemos al frente (actualizamos su timestamp de foco)
                return prev.map(c => c.canal_id === id
                    ? { ...c, zIndex: Math.max(...prev.map(oc => oc.zIndex)) + 1 }
                    : c
                )
            }

            // Si es nuevo, calculamos posición abajo a la izquierda con ligera cascada
            const count = prev.length % 5
            const modalWidth = 380
            const modalHeight = 500
            const leftMargin = 20
            const bottomMargin = 20

            const newPos = {
                x: leftMargin + (count * CASCADE_OFFSET),
                y: window.innerHeight - modalHeight - bottomMargin - (count * CASCADE_OFFSET)
            }

            return [...prev, {
                canal_id: id,
                pos: newPos,
                zIndex: (prev.length > 0 ? Math.max(...prev.map(oc => oc.zIndex)) : BASE_Z_INDEX) + 1
            }]
        })
    }, [])

    useEffect(() => {
        const handleOpen = (e) => {
            if (e.detail?.canal_id) {
                spawnChat(e.detail.canal_id)
            }
        }
        window.addEventListener('fh:chat:quick', handleOpen)
        return () => window.removeEventListener('fh:chat:quick', handleOpen)
    }, [spawnChat])

    const handleClose = (canal_id) => {
        setActiveChats(prev => prev.filter(c => c.canal_id !== canal_id))
    }

    const handleFocus = (canal_id) => {
        setActiveChats(prev => {
            const maxZ = Math.max(...prev.map(c => c.zIndex), BASE_Z_INDEX)
            return prev.map(c => c.canal_id === canal_id ? { ...c, zIndex: maxZ + 1 } : c)
        })
    }

    return (
        <div className="quickChatManager">
            {activeChats.map(chat => {
                const channelData = channels.find(ch => ch.id === chat.canal_id)
                return (
                    <QuickChatInstance
                        key={chat.canal_id}
                        canal_id={chat.canal_id}
                        canal={channelData}
                        initialPos={chat.pos}
                        zIndex={chat.zIndex}
                        onClose={() => handleClose(chat.canal_id)}
                        onFocus={() => handleFocus(chat.canal_id)}
                    />
                )
            })}
        </div>
    )
}
