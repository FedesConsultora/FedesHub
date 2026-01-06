import { useMemo, useRef, useState } from 'react'
import { useChannelMembers, useChannelPins } from '../../../hooks/useChat'
import { displayName, pickAvatar } from '../../../utils/people'
import HeaderPopover from './HeaderPopover'
import SearchMessages from '../shared/SearchMessages'
import { FiChevronDown, FiChevronUp, FiInfo } from 'react-icons/fi'
import { VscPinned } from "react-icons/vsc";

import { useAuthCtx } from '../../../context/AuthContext.jsx'
import Avatar from '../../Avatar.jsx'
import './ChannelHeader.scss'

export default function ChannelHeader({ canal, onOpenChannel, setView, onStartCreateGroup, onSelectMessage }) {
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)
  const toggle = () => setOpen(!open)
  const { user } = useAuthCtx() || {}
  const myId = Number(user?.id || 0)
  const { data: members = [] } = useChannelMembers(canal?.id)

  const { data: pins = [] } = useChannelPins(canal?.id)
  const pinnedCount = pins.length

  const titlePure = useMemo(() => {
    if (!canal) return ''
    if (canal?.tipo?.codigo === 'dm') {
      const other = (members || []).find(m => m.user_id !== myId) || {}
      return displayName(other) || `DM #${canal.id}`
    }
    return (canal?.nombre || canal?.slug || `Canal #${canal?.id || ''}`)?.replace(/^#/, '')
  }, [canal, members, myId])

  const otherUserId = useMemo(() => {
    if (canal?.tipo?.codigo !== 'dm') return null
    const other = (members || []).find(m => m.user_id !== myId)
    return other?.user_id ?? null
  }, [canal, members, myId])

  const avatarSrc = useMemo(() => {
    if (canal?.tipo?.codigo === 'dm') {
      const other = (members || []).find(m => m.user_id !== myId)
      return pickAvatar(other)
    }
    return pickAvatar(canal)
  }, [canal, members, myId])


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
      <Avatar src={avatarSrc} name={titlePure} size={44} className="avatarChan" />
      <button className="titleBtn" onClick={toggle} title="Información">
        <span className="hash">#</span>{titlePure}
      </button>
      {!!canal?.topic && <div className="topic">{canal.topic}</div>}
      <div className="spacer" />

      <div className="headerActions">
        <SearchMessages canal_id={canal?.id} onSelectMessage={onSelectMessage} />

        

        <button className={`btnGhost ${open ? 'active' : ''}`} onClick={toggle} title="Info">
          <FiInfo />{open ? <FiChevronUp /> : <FiChevronDown />}
        </button>
      </div>

      {open && (
        <HeaderPopover
          anchorRef={rootRef}
          canal={canal}
          members={members}
          onClose={() => setOpen(false)}
          onCreatedGroupFromDm={handleCreateGroupFromDm}
          onOpenChannel={onOpenChannel}
          onSelectMessage={onSelectMessage}
          setView={setView}
        />
      )}
    </div>
  )
}
