import React, { useMemo } from 'react'
import { VscPinned } from 'react-icons/vsc'
import { FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi'
import { useChannelPins, usePinMessage } from '../../../hooks/useChat'
import './PinnedBar.scss'

export default function PinnedBar({ canal_id, onSelectMessage }) {
    const { data: pins = [], isLoading } = useChannelPins(canal_id)
    const pinMutation = usePinMessage()
    const [currentIndex, setCurrentIndex] = React.useState(0)

    // Descartar pins sin mensaje
    const activePins = useMemo(() => pins.filter(p => !!p.mensaje), [pins])

    if (isLoading || activePins.length === 0) return null

    const currentPin = activePins[currentIndex] || activePins[0]
    const m = currentPin.mensaje

    const handleNext = (e) => {
        e.stopPropagation()
        setCurrentIndex((prev) => (prev + 1) % activePins.length)
    }

    const handlePrev = (e) => {
        e.stopPropagation()
        setCurrentIndex((prev) => (prev - 1 + activePins.length) % activePins.length)
    }

    const handleUnpin = (e) => {
        e.stopPropagation()
        pinMutation.mutate({ mensaje_id: m.id, canal_id, on: false })
    }

    return (
        <div className="pinnedBar" onClick={() => onSelectMessage(m)}>
            <div className="pinIcon">
                <VscPinned />
            </div>

            <div className="pinContent">
                <div className="pinLabel">
                    Mensaje fijado {activePins.length > 1 && `(${currentIndex + 1} de ${activePins.length})`}
                </div>
                <div className="pinText">
                    {m.body_text || (m.adjuntos?.length > 0 ? 'Archivo adjunto' : 'Mensaje')}
                </div>
            </div>

            <div className="pinActions">
                {activePins.length > 1 && (
                    <div className="pinNav">
                        <button onClick={handlePrev} title="Anterior"><FiChevronLeft /></button>
                        <button onClick={handleNext} title="Siguiente"><FiChevronRight /></button>
                    </div>
                )}
                <button className="unpinBtn" onClick={handleUnpin} title="Desfijar" disabled={pinMutation.isPending}>
                    <FiX />
                </button>
            </div>
        </div>
    )
}
