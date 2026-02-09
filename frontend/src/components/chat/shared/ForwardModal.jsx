import { useState, useMemo } from 'react'
import { FiX, FiSearch, FiSend } from 'react-icons/fi'
import { useChannels, useDmCandidates, useForwardMessage, useCreateChannel } from '../../../hooks/useChat'
import { displayName, pickAvatar } from '../../../utils/people'
import useAuth from '../../../hooks/useAuth'
import Avatar from '../../Avatar'
import './ForwardModal.scss'

export default function ForwardModal({ message, onClose }) {
    const { data: channels = [], isLoading: loadingChannels } = useChannels({ scope: 'mine' })
    const { data: dmCandidates = [], isLoading: loadingDms } = useDmCandidates()
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState(new Set()) // Set de strings: `u-${userId}` o `c-${canalId}`
    const forwardMutation = useForwardMessage()
    const createChannelMutation = useCreateChannel()
    const [isSending, setIsSending] = useState(false)

    const { user } = useAuth()
    const myId = user?.id

    const allDestinations = useMemo(() => {
        const list = []

        // 1. Canales y Grupos (solo los que NO son DM y tengo permiso de posteo)
        channels.filter(c => {
            if (c.tipo?.codigo === 'dm') return false
            if (!c.only_mods_can_post) return true

            const myMember = c.miembros?.find(m => m.user_id === myId)
            const myRol = myMember?.rol?.codigo
            return ['owner', 'admin', 'mod'].includes(myRol)
        }).forEach(c => {
            list.push({
                id: c.id,
                name: c.nombre || 'Canal sin nombre',
                type: c.tipo?.codigo || 'canal',
                avatar: c.imagen_url,
                isChannel: true
            })
        })

        // 2. Feders (de dmCandidates)
        dmCandidates.forEach(u => {
            list.push({
                id: u.dm_canal_id || null,
                userId: u.user_id,
                name: displayName(u),
                type: 'dm',
                avatar: pickAvatar(u),
                isChannel: false,
                user: u
            })
        })

        return list
    }, [channels, dmCandidates])

    const selectedList = useMemo(() => {
        return allDestinations.filter(d => {
            const key = d.userId ? `u-${d.userId}` : `c-${d.id}`
            return selected.has(key)
        })
    }, [allDestinations, selected])

    const filtered = useMemo(() => {
        if (!search.trim()) return allDestinations
        const s = search.toLowerCase()
        return allDestinations.filter(d => (d.name || '').toLowerCase().includes(s))
    }, [allDestinations, search])

    const handleToggle = (dest) => {
        const key = dest.userId ? `u-${dest.userId}` : `c-${dest.id}`
        const next = new Set(selected)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        setSelected(next)
    }

    const handleBatchForward = async () => {
        if (selected.size === 0) return
        setIsSending(true)

        try {
            const targetCanalIds = []

            for (const dest of selectedList) {
                if (dest.id) {
                    targetCanalIds.push(dest.id)
                } else if (dest.userId) {
                    // Crear DM al vuelo de forma secuencial (para evitar conflictos)
                    const res = await createChannelMutation.mutateAsync({
                        tipo_codigo: 'dm',
                        invited_user_ids: [dest.userId]
                    })
                    const newId = res.canal?.id || res.id
                    if (newId) targetCanalIds.push(newId)
                }
            }

            if (targetCanalIds.length > 0) {
                await forwardMutation.mutateAsync({
                    mensaje_id: message.id,
                    target_canal_ids: targetCanalIds
                })
                onClose()
            }
        } catch (err) {
            console.error(err)
            alert('Ocurrió un error al reenviar: ' + (err.message || 'Error desconocido'))
        } finally {
            setIsSending(false)
        }
    }

    return (
        <div className="forwardModalOverlay" onClick={onClose}>
            <div className="forwardModal" onClick={e => e.stopPropagation()}>
                <header>
                    <h3>Reenviar mensaje</h3>
                    <button className="closeBtn" onClick={onClose}><FiX /></button>
                </header>

                <div className="searchBar">
                    <FiSearch />
                    <input
                        type="text"
                        placeholder="Buscar persona o canal..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="destList">
                    {(loadingChannels || loadingDms) && <div className="loading">Cargando destinos...</div>}

                    {!loadingChannels && !loadingDms && filtered.length === 0 && (
                        <div className="empty">No se encontraron resultados</div>
                    )}

                    {filtered.map(dest => {
                        const key = dest.userId ? `u-${dest.userId}` : `c-${dest.id}`
                        const isSel = selected.has(key)
                        return (
                            <div key={key} className={`destItem ${isSel ? 'selected' : ''}`} onClick={() => handleToggle(dest)}>
                                <Avatar
                                    src={dest.avatar}
                                    name={dest.name}
                                    size={34}
                                    federId={dest.user?.feder_id || dest.user?.id_feder}
                                />
                                <div className="info">
                                    <span className="name">{dest.name}</span>
                                    <span className="type">
                                        {dest.type === 'grupo' ? 'Grupo' : dest.type === 'canal' ? 'Canal' : ''}
                                    </span>
                                </div>
                                <div className="checkbox">
                                    <div className={`indicator ${isSel ? 'checked' : ''}`} />
                                </div>
                            </div>
                        )
                    })}
                </div>

                <footer className="modalFooter">
                    <div className="selectionInfo">
                        {selected.size > 0 && (
                            <span>{selected.size} {selected.size === 1 ? 'seleccionado' : 'seleccionados'}</span>
                        )}
                    </div>
                    <button
                        className="confirmBtn"
                        disabled={selected.size === 0 || isSending}
                        onClick={handleBatchForward}
                    >
                        {isSending ? 'Enviando...' : 'Reenviar ahora'}
                    </button>
                </footer>
            </div>
        </div>
    )
}
