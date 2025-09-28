import { useMemo, useRef, useState } from 'react'
import { FiChevronDown, FiChevronUp, FiInfo } from 'react-icons/fi'
import { useChannelMembers } from '../../../hooks/useChat'
import { displayName } from '../../../utils/people'
import HeaderPopover from './HeaderPopover'
import './ChannelHeader.scss'
import { useAuthCtx } from '../../../context/AuthContext.jsx'
import { resolveMediaUrl } from '../../../utils/media'

export default function ChannelHeader({ canal, onOpenChannel, setView, onStartCreateGroup }) {
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)
  const { user } = useAuthCtx() || {}
  const myId = Number(user?.id || 0)
  const { data: members = [] } = useChannelMembers(canal?.id)

  const titlePure = useMemo(() => {
    if (!canal) return ''
    if (canal?.tipo?.codigo === 'dm') {
      const other = (members || []).find(m => m.user_id !== myId) || {}
      return displayName(other) || `DM #${canal.id}`
    }
    return (canal?.nombre || canal?.slug || `Canal #${canal?.id||''}`)?.replace(/^#/,'')
  }, [canal, members, myId])

  const otherUserId = useMemo(() => {
    if (canal?.tipo?.codigo !== 'dm') return null
    const other = (members || []).find(m => m.user_id !== myId)
    return other?.user_id ?? null
  }, [canal, members, myId])

  const avatarUrl =
    canal?.imagen_url ||
    resolveMediaUrl(canal?.imagen_url) ||
    `https://ui-avatars.com/api/?background=eff9ff&color=0d1117&name=${encodeURIComponent(titlePure||'U')}`

  const toggle = () => setOpen(v => !v)

  const handleCreateGroupFromDm = () => {
    if (!otherUserId) return
    const other = (members || []).find(m => m.user_id === otherUserId)
    const nm = displayName(other) || other?.email || `Usuario ${otherUserId}`
    onStartCreateGroup?.({
      initialTipo: 'grupo',
      lockTipo: true,
      initialNombre: `Chat con ${nm}`,
      preselectUserIds: [otherUserId]
    })
    setOpen(false)
  }

  return (
    <div className="panel-header" ref={rootRef}>
      <img src={avatarUrl} alt="" className="avatarChan" />
      <button className="titleBtn" onClick={toggle} title="Información">
        <span className="hash">#</span>{titlePure}
      </button>
      {!!canal?.topic && <div className="topic">{canal.topic}</div>}
      <div className="spacer" />
      <button className={`btnGhost ${open?'active':''}`} onClick={toggle} title="Info">
        <FiInfo/>{open ? <FiChevronUp/> : <FiChevronDown/>}
      </button>

      {open && (
        <HeaderPopover
          anchorRef={rootRef}
          canal={canal}
          members={members}
          onClose={() => setOpen(false)}
          onCreatedGroupFromDm={handleCreateGroupFromDm}
          onOpenChannel={onOpenChannel}
          setView={setView}
        />
      )}
    </div>
  )
}
