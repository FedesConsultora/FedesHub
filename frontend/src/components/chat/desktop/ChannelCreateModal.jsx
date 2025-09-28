import { useMemo, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FiHash, FiTag, FiImage, FiLock, FiX, FiSearch } from 'react-icons/fi'
import { chatApi } from '../../../api/chat'
import { useDmCandidates } from '../../../hooks/useChat'
import { displayName } from '../../../utils/people'
import SelectedMembersTable from './SelectedMembersTable'
import './ChannelCreateModal.scss'

const PRESENCE_RANK = { online: 3, dnd: 2, away: 1, offline: 0 }

export default function ChannelCreateModal({
  open = false,
  onClose,
  onCreated,
  initialTipo = 'canal',
  lockTipo = false,
  initialNombre = '',
  preselectUserIds = []
}) {
  // ----- estado básico
  const [tipo, setTipo] = useState(initialTipo) // 'canal' | 'grupo'
  const [nombre, setNombre] = useState(initialNombre || '')
  const [topic, setTopic] = useState('')
  const [privado, setPrivado] = useState(false)

  const [imgFile, setImgFile] = useState(null)
  const [imgPreview, setImgPreview] = useState('')

  const [slug, setSlug] = useState('')
  const [onlyMods, setOnlyMods] = useState(false)

  // selección + orden
  const [selMap, setSelMap] = useState(() => Object.create(null)) // { [uid]: 'member'|'admin'|'mod'|'guest' }
  const [selOrder, setSelOrder] = useState([]) // [uid,...]

  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: candidatesRaw = [] } = useDmCandidates()

  // ---- candidatos ordenados: seleccionados primero → presencia → nombre
  const candidates = useMemo(() => {
    const arr = (candidatesRaw || []).filter(u => !!u.user_id)
    const withKeys = arr.map(u => ({
      ...u,
      _sel: !!selMap[u.user_id],
      _rank: PRESENCE_RANK[u.presence_status] ?? 0,
      _dn: (displayName(u) || u.email || '').toLowerCase()
    }))
    withKeys.sort((a, b) => {
      if (a._sel !== b._sel) return a._sel ? -1 : 1
      if (a._rank !== b._rank) return b._rank - a._rank
      return a._dn.localeCompare(b._dn)
    })
    return withKeys
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidatesRaw, selMap])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return candidates
    return candidates.filter(u => {
      const nm = `${displayName(u) || ''} ${u.email || ''}`.toLowerCase()
      return nm.includes(s)
    })
  }, [q, candidates])

  const selectedCount = selOrder.length
  const allowedRoles = useMemo(
    () => (tipo === 'canal' ? ['admin', 'mod', 'member', 'guest'] : ['admin', 'member']),
    [tipo]
  )

  // bloquear scroll y tecla ESC sólo mientras esté abierto
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])

  // reset AL ABRIR (sólo depende de `open`)
  useEffect(() => {
    if (!open) return
    setTipo(initialTipo)
    setNombre(initialNombre || '')
    setTopic('')
    setPrivado(false)
    setSlug('')
    setOnlyMods(false)
    setImgFile(null)
    setImgPreview('')
    setQ('')

    const nextMap = Object.create(null)
    const nextOrder = (preselectUserIds || [])
      .map(Number)
      .filter(n => Number.isInteger(n) && n > 0)
    nextOrder.forEach(uid => { nextMap[uid] = 'member' })
    setSelMap(nextMap)
    setSelOrder(nextOrder)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // preview avatar
  useEffect(() => {
    if (!imgFile) { setImgPreview(''); return }
    const url = URL.createObjectURL(imgFile)
    setImgPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [imgFile])

  // helpers selección
  const addSel = (uid, rol = 'member') => {
    setSelMap(prev => ({ ...prev, [uid]: rol }))
    setSelOrder(prev => (prev.includes(uid) ? prev : [...prev, uid]))
  }
  const removeSel = (uid) => {
    setSelMap(prev => { const n = { ...prev }; delete n[uid]; return n })
    setSelOrder(prev => prev.filter(id => id !== uid))
  }
  const toggleSel = (uid) => (selMap[uid] ? removeSel(uid) : addSel(uid, 'member'))
  const setRole = (uid, rol) => setSelMap(prev => ({ ...prev, [uid]: rol }))

  async function onSubmit(e) {
    e?.preventDefault?.()
    if (!nombre.trim()) return
    if (tipo === 'grupo' && selectedCount === 0) return

    setLoading(true)
    try {
      const payload = {
        tipo_codigo: tipo,
        nombre: nombre.trim(),
        topic: topic?.trim() || null,
        is_privado: !!privado,
        invited_user_ids: selOrder
      }
      if (tipo === 'canal') {
        if (slug.trim()) payload.slug = slug.trim()
        payload.only_mods_can_post = !!onlyMods
        payload.slowmode_seconds = 25 // fijo (no se muestra)
      }

      const c = await chatApi.channels.create(payload)

      // setear roles especiales
      const roleOps = Object.entries(selMap)
        .filter(([, rol]) => rol && rol !== 'member')
        .map(([uid, rol]) =>
          chatApi.channels.members.upsert(c.id, { user_id: Number(uid), rol_codigo: rol })
        )
      if (roleOps.length) await Promise.allSettled(roleOps)

      if (imgFile && chatApi?.channels?.uploadAvatar) {
        try { await chatApi.channels.uploadAvatar(c.id, imgFile) } catch {}
      }

      try { window.dispatchEvent(new CustomEvent('fh:push', { detail: { type: 'chat.channel.updated', canal: c } })) } catch {}

      onCreated?.(c)
      onClose?.()
    } catch (e) {
      console.error('create channel', e)
    } finally { setLoading(false) }
  }

  if (!open) return null

  const modal = (
    <div className="ccModalWrap" role="dialog" aria-modal="true" aria-label="Crear canal o grupo">
      <div className="ccBackdrop" onClick={onClose} />
      <form className="ccCard" onSubmit={onSubmit} aria-labelledby="cc_title" onClick={(e)=>e.stopPropagation()}>
        <header className="ccHeader">
          <div className="brand">
            <div id="cc_title" className="logo">{tipo === 'grupo' ? 'Nuevo grupo' : 'Nuevo canal'}</div>
            <div className="subtitle">Definí nombre, miembros y opciones</div>
          </div>
          <button type="button" className="close" onClick={onClose} aria-label="Cerrar"><FiX /></button>
        </header>

        <div className="ccBody">
          <div className="tabsSmall" role="tablist" aria-label="Tipo de conversación">
            <button type="button" role="tab" className={tipo === 'canal' ? 'active' : ''} onClick={() => !lockTipo && setTipo('canal')} disabled={lockTipo}>Canal</button>
            <button type="button" role="tab" className={tipo === 'grupo' ? 'active' : ''} onClick={() => !lockTipo && setTipo('grupo')} disabled={lockTipo}>Grupo</button>
          </div>

          {/* Campos base */}
          <label className="lbl" htmlFor="cc_name">Nombre <span className="req">*</span></label>
          <div className="field">
            <FiHash className="ico" aria-hidden />
            <input id="cc_name" name="nombre" type="text" placeholder="#general / Equipo de soporte" value={nombre} onChange={(e)=>setNombre(e.target.value)} required />
          </div>

          {tipo === 'canal' && (
            <>
              <label className="lbl" htmlFor="cc_slug">Slug (opcional)</label>
              <div className="field">
                <FiTag className="ico" aria-hidden />
                <input id="cc_slug" name="slug" type="text" placeholder="general / soporte / anuncios" value={slug} onChange={(e)=>setSlug(e.target.value)} />
              </div>
            </>
          )}

          <label className="lbl" htmlFor="cc_topic">Tema</label>
          <div className="field">
            <FiTag className="ico" aria-hidden />
            <input id="cc_topic" name="topic" type="text" placeholder="Descripción breve…" value={topic} onChange={(e)=>setTopic(e.target.value)} />
          </div>

          <label className="lbl" htmlFor="cc_avatar">Imagen de perfil</label>
          <div className="field filefield">
            {imgPreview ? <img src={imgPreview} alt="preview" className="avatarPreview" /> : <FiImage className="ico" aria-hidden />}
            <input id="cc_avatar" name="avatar" type="file" accept="image/*" onChange={(e)=>setImgFile(e.target.files?.[0] || null)} />
          </div>

          <div className="grid2">
            <div className="field checkbox">
              <FiLock className="ico" aria-hidden />
              <input id="cc_mods" name="only_mods_can_post" type="checkbox" checked={onlyMods} onChange={(e)=>setOnlyMods(e.target.checked)} />
              <label htmlFor="cc_mods">Sólo moderadores pueden postear</label>
            </div>
            <div className="field checkbox">
              <FiLock className="ico" aria-hidden />
              <input id="cc_priv" name="is_privado" type="checkbox" checked={privado} onChange={(e)=>setPrivado(e.target.checked)} />
              <label htmlFor="cc_priv">{tipo === 'grupo' ? 'Grupo privado' : 'Canal privado'}</label>
            </div>
          </div>

          {/* Miembros */}
          <div className="sep" />
          <div className="lblRow">
            <span className="lbl">Miembros</span>
            <span className="muted">{selectedCount} seleccionad{selectedCount === 1 ? 'o' : 'os'}</span>
          </div>

          <div className="memberGrid">
            {/* IZQUIERDA: lista de candidatos */}
            <div className="leftPane">
              <div className="field">
                <FiSearch className="ico" aria-hidden />
                <input type="search" name="search_members" placeholder="Buscar por nombre o email…" value={q} onChange={(e)=>setQ(e.target.value)} autoComplete="off" />
              </div>

              <div className="list" role="listbox" aria-label="Candidatos">
                {filtered.map(u => {
                  const dn = displayName(u) || u.email || `Usuario ${u.user_id}`
                  const checked = !!selMap[u.user_id]
                  const id = `pick_${u.user_id}`
                  return (
                    <label key={u.user_id} className={'row' + (checked ? ' sel' : '')} htmlFor={id} data-user-id={u.user_id}>
                      <span className="ava">{(dn[0] || '?').toUpperCase()}</span>
                      <span className="nm">
                        {dn}
                        {u.email && <span className="sub">{u.email}</span>}
                      </span>
                      <span className="presenceDot" data-status={u.presence_status || 'offline'} />
                      <input id={id} type="checkbox" className="checkSel" checked={checked} onChange={()=>toggleSel(u.user_id)} />
                    </label>
                  )
                })}
                {filtered.length === 0 && <div className="empty">Sin resultados</div>}
              </div>
            </div>

            {/* DERECHA: mini tabla de seleccionados */}
            <div className="rightPane">
              <SelectedMembersTable
                selOrder={selOrder}
                selMap={selMap}
                candidates={candidates}
                allowedRoles={allowedRoles}
                onChangeRole={setRole}
                onRemove={removeSel}
              />
            </div>
          </div>
        </div>

        <footer className="ccFooter">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button className="submit" disabled={loading || !nombre.trim() || (tipo === 'grupo' && selOrder.length === 0)}>
            {loading ? 'Creando…' : (tipo === 'grupo' ? 'Crear grupo' : 'Crear canal')}
          </button>
        </footer>
      </form>
    </div>
  )

  return createPortal(modal, document.body)
}