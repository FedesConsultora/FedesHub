import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiPlus, FiX, FiTag, FiLock, FiCamera, FiEdit2, FiSave, FiHash, FiTrash2, FiUserPlus, FiMessageSquare, FiInfo, FiChevronUp, FiSearch, FiCheck } from 'react-icons/fi'
import { IoRemoveCircleOutline } from "react-icons/io5";

import AttachmentIcon from '../shared/AttachmentIcon'
import { displayName, firstInitial } from '../../../utils/people'
import Avatar from '../../Avatar.jsx'
import { useAuthCtx } from '../../../context/AuthContext.jsx'
import {
  useUploadChannelAvatar,
  useUpdateChannel,
  usePatchMemberRole,
  useRemoveMember,
  useAddMember,
  useDeleteChannel,
  useChannelPins,
  useDmCandidates,
} from '../../../hooks/useChat'
import { useModal } from '../../modal/ModalProvider'
import './HeaderPopover.scss'
import { resolveMediaUrl } from '../../../utils/media'
import AttendanceBadge from '../../common/AttendanceBadge.jsx'
import useAttendanceStatus, { getModalidad } from '../../../hooks/useAttendanceStatus.js'
import GlobalLoader from '../../loader/GlobalLoader.jsx'

const PRES_COL = { online: '#31c48d', away: '#f6ad55', dnd: '#ef4444', offline: '#6b7280' }
const ROL_ES = { owner: 'propietario', admin: 'administrador', mod: 'moderador', member: 'miembro', guest: 'invitado' }

const PRESENCE_RANK = { online: 3, dnd: 2, away: 1, offline: 0 }

/** ---------- utils imagen (frontend) ---------- */
async function readAsImage(file) {
  // Preferimos createImageBitmap por performance
  if (window.createImageBitmap) {
    try {
      const bmp = await createImageBitmap(file)
      return { width: bmp.width, height: bmp.height, draw: (ctx, w, h) => ctx.drawImage(bmp, 0, 0, w, h) }
    } catch { }
  }
  // Fallback clásico con <img>
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = url
    })
    return { width: img.width, height: img.height, draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h) }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Redimensiona y convierte a JPEG.
 * - maxSide: máximo lado en px (sin upscaling)
 * - quality: 0..1
 * - background: color de fondo para PNG con alpha
 */
async function downscaleToJpeg(file, { maxSide = 512, quality = 0.82, background = '#fff' } = {}) {
  if (!(file instanceof File)) throw new Error('file inválido')
  // Si no es imagen, devolvemos tal cual
  if (!/^image\//i.test(file.type)) return file

  const src = await readAsImage(file)
  const max = Math.max(src.width, src.height)
  const scale = Math.min(1, maxSide / (max || 1))
  const w = Math.max(1, Math.round(src.width * scale))
  const h = Math.max(1, Math.round(src.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  // alpha:false usa un backbuffer opaco; igual rellenamos por las dudas
  const ctx = canvas.getContext('2d', { alpha: false })
  if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, w, h) }
  src.draw(ctx, w, h)

  const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality))
  // Si algo falló, devolvemos el original
  if (!blob) return file

  // Si por alguna razón el JPEG quedó más grande, nos quedamos con el más chico
  const best = blob.size < file.size ? blob : file
  const finalBlob = best instanceof Blob ? best : new Blob([best], { type: file.type || 'application/octet-stream' })

  // Aseguramos extensión .jpg
  const base = (file.name || 'avatar').replace(/\.[^.]+$/, '')
  return new File([finalBlob], `${base}.jpg`, { type: 'image/jpeg' })
}

export default function HeaderPopover({
  anchorRef,
  canal,
  members = [],
  onClose,
  onCreatedGroupFromDm,
  onSelectMessage,
}) {
  const popRef = useRef(null)
  const fileRef = useRef(null)
  const { user } = useAuthCtx() || {}
  const modal = useModal()
  const myId = Number(user?.id || 0)

  const [tab, setTab] = useState('members')
  const [files, setFiles] = useState([])
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)

  // edición inline
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState({ nombre: '', slug: '', topic: '', descripcion: '', is_privado: false, only_mods_can_post: false })

  // avatar (compreso)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const previewUrlRef = useRef('')

  // modal de agregar miembro
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // hooks (mutateAsync para poder await)
  const { mutateAsync: uploadAvatar, isLoading: uploading } = useUploadChannelAvatar()
  const { mutateAsync: updateChannel, isLoading: saving } = useUpdateChannel()
  const { mutateAsync: patchRole, isLoading: roleSaving } = usePatchMemberRole()
  const { mutateAsync: removeMember, isLoading: removingMember } = useRemoveMember()
  const { mutateAsync: addMember, isLoading: addingMember } = useAddMember()
  const { mutateAsync: deleteChannel } = useDeleteChannel()
  const { data: pins = [], isLoading: loadingPins } = useChannelPins(canal?.id)
  const { data: candidatesRaw = [], isLoading: loadingCandidates } = useDmCandidates()

  const isDM = canal?.tipo?.codigo === 'dm'
  const myMember = members.find(m => Number(m.user_id) === myId) || null
  const myRol = myMember?.rol?.codigo || 'member'
  const canEditSettings = !isDM && ['owner', 'admin', 'mod'].includes(myRol)
  const canEditRoles = !isDM && ['owner', 'admin'].includes(myRol)

  const otherUser = useMemo(
    () => (isDM ? (members || []).find(m => Number(m.user_id) !== myId) || null : null),
    [isDM, members, myId]
  )

  const [justAdded, setJustAdded] = useState(new Set())

  const allCandidates = useMemo(() => {
    const memberIds = new Set(members.map(m => Number(m.user_id)))
    return (candidatesRaw || [])
      .filter(u => !!u.user_id)
      .map(u => ({
        ...u,
        id: u.user_id,
        isMember: memberIds.has(Number(u.user_id))
      }))
  }, [candidatesRaw, members])

  // Collect all feder_ids for attendance status
  const allFederIds = useMemo(() => {
    const ids = new Set()

    // Helper to convert to number and handle multiple feder_id paths
    const toNum = (val) => {
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    };

    const getFid = (obj) => {
      if (!obj) return 0;
      return toNum(
        obj.feder_id ?? obj.id_feder ??
        obj.feder?.id ??
        obj.user?.feder?.id ??
        obj.autor?.feder_id ?? obj.autor?.id_feder ??
        obj.autor?.feder?.id
      );
    };

    // Collect feder_ids from current members
    for (const m of (members || [])) {
      const fid = getFid(m);
      if (fid) ids.add(fid);
    }

    // Collect feder_ids from candidates (for adding members)
    for (const u of (allCandidates || [])) {
      const fid = getFid(u);
      if (fid) ids.add(fid);
    }

    // Collect feder_id from the other user in a DM
    if (otherUser) {
      const fid = getFid(otherUser);
      if (fid) ids.add(fid);
    }

    return Array.from(ids).filter(Boolean); // Filter out any 0s from toNum
  }, [members, allCandidates, otherUser]);

  const { statuses } = useAttendanceStatus(allFederIds)

  // preview avatar
  useEffect(() => {
    // limpia URL previa
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = ''
    }
    if (!avatarFile) { setAvatarPreview(''); return }
    const url = URL.createObjectURL(avatarFile)
    previewUrlRef.current = url
    setAvatarPreview(url)
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = ''
      }
    }
  }, [avatarFile])

  // init form al cambiar canal
  useEffect(() => {
    if (!canal) return
    setForm({
      nombre: canal?.nombre || '',
      slug: canal?.slug || '',
      topic: canal?.topic || '',
      descripcion: canal?.descripcion || '',
      is_privado: !!canal?.is_privado,
      only_mods_can_post: !!canal?.only_mods_can_post
    })
    setEdit(false)
  }, [canal?.id]) // eslint-disable-line

  // pick + comprimir
  const onPickAvatar = async (file) => {
    if (!file || !canal?.id || isDM) return
    try {
      // reducida 512px, calidad 0.82
      const compact = await downscaleToJpeg(file, { maxSide: 512, quality: 0.82 })
      setAvatarFile(compact) // se previsualiza el comprimido
      setEdit(true)
    } catch (e) {
      console.error('downscale avatar', e)
      // si algo falla, al menos mostrá el original
      setAvatarFile(file)
      setEdit(true)
    }
  }

  const title = useMemo(() => {
    if (!canal) return ''
    if (isDM) return displayName(otherUser) || otherUser?.email || `DM #${canal?.id}`
    return (canal?.nombre || canal?.slug || `Canal #${canal?.id}`)?.replace(/^#/, '')
  }, [canal, isDM, otherUser])

  const avatarUrl =
    avatarPreview ||
    resolveMediaUrl(canal?.imagen_url) ||
    `https://ui-avatars.com/api/?background=eff9ff&color=0d1117&name=${encodeURIComponent(title || 'U')}`

  // ESC para cerrar
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (showAddMemberModal) {
          setShowAddMemberModal(false)
        } else {
          onClose?.()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, showAddMemberModal])

  // cargar adjuntos
  useEffect(() => {
    let alive = true
    async function fetchKind(kind) {
      if (!canal?.id) return []
      try {
        const { chatApi } = await import('../../../api/chat') // lazy
        return (await chatApi.channels.attachments(canal.id, { kind, limit: 100 })) || []
      } catch { return [] }
    }
    async function load() {
      if (!canal?.id) return
      setLoading(true)
      const [f, i] = await Promise.all([fetchKind('files'), fetchKind('images')])
      if (!alive) return
      setFiles(f); setImages(i); setLoading(false)
    }
    if (tab !== 'members') load()
    return () => { alive = false }
  }, [tab, canal?.id])

  // guardar
  const onSave = async () => {
    if (!canEditSettings || !canal?.id) return
    const patch = { ...form }
    try {
      await updateChannel({ canal, patch }) // PUT o PATCH según corresponda
      if (avatarFile) {
        await uploadAvatar({ canal_id: canal.id, file: avatarFile })
        setAvatarFile(null)
        setAvatarPreview('')
      }
      setEdit(false)
    } catch (e) {
      console.error('save header', e)
    }
  }

  // roles
  const optionsFor = (targetCode) => {
    if (myRol === 'owner') return ['admin', 'mod', 'member', 'guest']
    if (targetCode === 'owner') return []
    return ['mod', 'member', 'guest']
  }
  const canTouchUser = (m) => {
    if (!canEditRoles) return false
    if (Number(m.user_id) === myId) return false
    if (myRol === 'admin' && m?.rol?.codigo === 'owner') return false
    return true
  }
  const onChangeRole = async (m, next) => {
    try { await patchRole({ canal_id: canal.id, user_id: m.user_id, rol_codigo: next }) } catch { }
  }

  // modal eliminar miembro
  const onRemoveMember = async (m) => {
    if (!canTouchUser(m)) return
    const ok = await modal.confirm({
      title: 'Eliminar integrante',
      message: `¿Estás seguro de eliminar a ${displayName(m)} del ${canal?.tipo?.codigo === 'grupo' ? 'grupo' : 'canal'}?`,
      tone: 'danger',
      okText: 'Eliminar',
      cancelText: 'Cancelar'
    })
    if (ok) {
      try {
        await removeMember({ canal_id: canal.id, user_id: m.user_id })
      } catch (e) {
        console.error('remove member', e)
        alert('Error al eliminar el miembro')
      }
    }
  }

  // eliminar canal (modal)
  const onDeleteChannel = async () => {
    const ok = await modal.confirm({
      title: 'Eliminar canal',
      message: `¿Estás seguro de eliminar "${title}" de forma permanente? Nota: Esta acción no se puede deshacer.`,
      tone: 'danger',
      okText: 'Eliminar',
      cancelText: 'Cancelar'
    })
    if (ok) {
      try {
        await deleteChannel({ canal_id: canal.id })
        onClose?.()
      } catch (e) {
        console.error('delete channel', e)
        alert('Error al eliminar el canal')
      }
    }
  }

  // agregar miembro (modal)
  const onOpenAddMember = (e) => {
    e?.stopPropagation()
    setShowAddMemberModal(true)
  }

  const onAddMemberToChannel = async (userId) => {
    if (!canal?.id || !userId) return
    const uid = Number(userId)
    // Optimistic update
    setJustAdded(prev => new Set([...prev, uid]))
    try {
      await addMember({ canal_id: canal.id, user_id: uid, rol_codigo: 'member' })
      // No cerramos el modal para permitir agregar múltiples
    } catch (e) {
      console.error('add member', e)
      setJustAdded(prev => {
        const next = new Set(prev)
        next.delete(uid)
        return next
      })
      alert('Error al agregar el miembro')
    }
  }

  const handleScrim = () => onClose?.()

  return (
    <>
      <div className="hdrPop_scrim" onClick={handleScrim} />
      <div className="hdrPop_panel" ref={popRef} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="hdrPop_header">
          <div className="avaWrap">
            <Avatar src={avatarUrl} name={title} size={80} />
            {!isDM && canEditSettings && (
              <label className="editBtn" title="Cambiar imagen">
                <FiCamera />
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => onPickAvatar(e.target.files?.[0] || null)}
                />
              </label>
            )}
            {(uploading) && <span className="uploading">Guardando…</span>}
          </div>

          <div className="meta">
            {edit ? (
              <div className="editForm_integrated">
                <div className="fGroup">
                  <input
                    className="title-input"
                    value={form.nombre}
                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Nombre del canal"
                  />
                </div>
                {canal?.tipo?.codigo === 'canal' && (
                  <div className="fGroup">
                    <FiTag className="ico" />
                    <input
                      value={form.slug}
                      onChange={e => setForm({ ...form, slug: e.target.value })}
                      placeholder="Identificador (slug)"
                    />
                  </div>
                )}
                <div className="fGroup">
                  <FiTag className="ico" />
                  <input
                    value={form.topic}
                    onChange={e => setForm({ ...form, topic: e.target.value })}
                    placeholder="Tema o tagline…"
                  />
                </div>
                <div className="fGroup vertical">
                  <textarea
                    value={form.descripcion}
                    onChange={e => setForm({ ...form, descripcion: e.target.value })}
                    placeholder="Descripción detallada…"
                    rows={2}
                  />
                </div>
                <div className="fChecks_integrated">
                  <label className="check"><input type="checkbox" checked={form.is_privado} onChange={e => setForm({ ...form, is_privado: e.target.checked })} /> <FiLock /> Privado</label>
                  <label className="check"><input type="checkbox" checked={form.only_mods_can_post} onChange={e => setForm({ ...form, only_mods_can_post: e.target.checked })} /> <FiMessageSquare /> Sólo mods</label>
                </div>
              </div>
            ) : (
              <>
                <div className="title">{title}</div>
                <div className="meta-chips">
                  {!!canal?.topic && (
                    <div className="info-chip"><FiTag /> {canal.topic}</div>
                  )}
                  {!!canal?.descripcion && (
                    <div className="info-chip desc"><FiInfo /> {canal.descripcion}</div>
                  )}
                  {!isDM && (
                    <div className="info-chip">
                      <FiLock /> {canal?.only_mods_can_post ? 'Sólo owner/admin/mod' : 'Todos pueden postear'}
                    </div>
                  )}
                  {canal?.tipo?.codigo === 'grupo' && (
                    <div className="info-chip"><FiLock /> {canal?.is_privado ? 'Grupo privado' : 'Grupo público'}</div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="actions">
            {!isDM && canEditSettings && !edit && (
              <>
                <button className="icon-btn ghost" onClick={() => setEdit(true)} title="Editar"><FiEdit2 /></button>
                <button className="icon-btn danger" onClick={onDeleteChannel} title="Eliminar"><FiTrash2 /></button>
              </>
            )}

            {edit && (
              <>
                <button className="icon-btn ghost" onClick={() => setEdit(false)} title="Cancelar"><FiX /></button>
                <button className="icon-btn primary" onClick={onSave} disabled={saving || uploading} title="Guardar">
                  {(saving || uploading) ? <FiSave className="spin" /> : <FiSave />}
                </button>
              </>
            )}
            {isDM && (
              <button className="chip primary" onClick={onCreatedGroupFromDm}><FiPlus /> Crear grupo</button>
            )}
            <button className="icon-btn ghost" onClick={onClose} aria-label="Cerrar" title="Cerrar"><FiChevronUp /></button>
          </div>
        </div>


        {/* Edición inline */}
        {/* The editForm content was moved into the header's meta section */}

        {/* DM: ficha de la otra persona */}
        {isDM && !!otherUser && (
          <div className="dmCard">
            <div className="row">
              <div className="lab">Nombre</div>
              <div className="val">{displayName(otherUser) || 'usuario'}</div>
            </div>
            {otherUser.email && (
              <div className="row">
                <div className="lab">Email</div>
                <div className="val">{otherUser.email}</div>
              </div>
            )}
            <div className="row">
              <div className="lab">Estado</div>
              <div className="val">
                <AttendanceBadge modalidad={getModalidad(statuses, otherUser.id_feder || otherUser.feder_id || otherUser.feder?.id || otherUser.user?.feder?.id)} size={14} />
                {otherUser.presence_status || 'offline'}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="hdrPop_tabs">
          <button className={tab === 'members' ? 'active' : ''} onClick={() => setTab('members')}>Integrantes</button>
          <button className={tab === 'pins' ? 'active' : ''} onClick={() => setTab('pins')}>
            Fijados {pins.length > 0 && <span className="tab-count">{pins.length}</span>}
          </button>
          <button className={tab === 'files' ? 'active' : ''} onClick={() => setTab('files')}>Archivos</button>
          <button className={tab === 'images' ? 'active' : ''} onClick={() => setTab('images')}>Imágenes</button>
          {!isDM && canEditSettings && tab === 'members' && (
            <button className="chip primary addMemberBtn" onClick={onOpenAddMember} aria-label="Agregar integrantes" data-tooltip="Agregar integrantes">
              <FiUserPlus size={21} style={{ position: 'relative', top: '2px' }} />
            </button>
          )}
        </div>

        {/* Members (con cambio de rol) */}
        {tab === 'members' && (
          <div className="list">
            {members.map(m => {
              const canTouch = canTouchUser(m)
              const opts = optionsFor(m?.rol?.codigo || 'member')
              return (
                <div key={m.user_id} className="row">
                  <div className="avaWrapper" style={{ position: 'relative' }}>
                    <Avatar src={m.avatar_url} name={displayName(m)} size={32} />
                    <AttendanceBadge modalidad={getModalidad(statuses, m.id_feder || m.feder_id || m.feder?.id || m.user?.feder?.id)} size={12} />
                  </div>
                  <div className="meta">
                    <div className="name">{displayName(m) || 'usuario'}</div>
                    <div className="sub">
                      {!canTouch || !opts.length ? (
                        <span className="rol">{ROL_ES[m?.rol?.codigo] || 'miembro'}</span>
                      ) : (
                        <div className="roleSelect">
                          <select
                            value={m?.rol?.codigo || 'member'}
                            disabled={roleSaving}
                            onChange={(e) => onChangeRole(m, e.target.value)}
                            aria-label={`Rol para ${displayName(m) || m.user_id}`}
                          >
                            {opts.map(r => (
                              <option key={r} value={r}>
                                {r === 'admin' ? 'Admin' : r === 'mod' ? 'Mod' : r === 'member' ? 'Miembro' : 'Invitado'}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {/* Presence removed as requested, using AttendanceBadge instead */}
                    </div>
                  </div>
                  {canTouch && (
                    <button
                      className="btnDeleteMember"
                      onClick={() => onRemoveMember(m)}
                      disabled={removingMember}
                      data-tooltip="Eliminar integrante"
                      aria-label={`Eliminar a ${displayName(m) || m.user_id}`}
                    >
                      <IoRemoveCircleOutline
                      />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Pins */}
        {tab === 'pins' && (
          <div className="list pinsList">
            {loadingPins && <div className="placeholder">Cargando fijados…</div>}
            {!loadingPins && pins.length === 0 && <div className="placeholder">No hay mensajes fijados</div>}
            {!loadingPins && pins.map(p => {
              const m = p.mensaje
              if (!m) return null
              return (
                <div
                  key={p.id}
                  className="pinRow"
                  onClick={() => {
                    onSelectMessage?.(m)
                    onClose?.()
                  }}
                >
                  <Avatar src={m.autor?.feder?.avatar_url} name={displayName(m.autor)} size={24} />
                  <div className="meta">
                    <div className="name">{displayName(m.autor)} • {new Date(m.created_at).toLocaleDateString()}</div>
                    <div className="txtBody">{m.body_text}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {tab === 'files' && (
          <div className="fileList" style={{ position: 'relative', minHeight: 150 }}>
            {loading && <GlobalLoader size={60} />}
            {!loading && files.length === 0 && <div className="placeholder">No hay archivos</div>}
            {!loading && files.map(a => (
              <a key={`f-${a.id}`} className="fileRow" href={a.file_url} target="_blank" rel="noreferrer">
                <div className="ico"><AttachmentIcon mime={a.mime_type || ''} name={a.file_name || ''} /></div>
                <div className="name" title={a.file_name || a.file_url}>{a.file_name || a.file_url}</div>
                <div className="muted">{(a.mime_type || '').toLowerCase()}</div>
              </a>
            ))}
          </div>
        )}

        {/* Images */}
        {tab === 'images' && (
          <div className="imgGrid" style={{ position: 'relative', minHeight: 150 }}>
            {loading && <GlobalLoader size={60} />}
            {!loading && images.length === 0 && <div className="placeholder">No hay imágenes</div>}
            {!loading && images.map(a => (
              <a key={`i-${a.id}`} className="imgCell" href={a.file_url} target="_blank" rel="noreferrer">
                <img src={a.file_url} alt={a.file_name || 'img'} />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Modal de confirmación para eliminar canal */}

      {/* Modal de agregar miembro */}
      {showAddMemberModal && createPortal(
        <div className="ccModalWrap" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
          <div className="ccBackdrop" onClick={() => { setShowAddMemberModal(false); setJustAdded(new Set()); }} />
          <div className="ccCard addMember_card" onClick={(e) => e.stopPropagation()}>
            <header className="ccHeader">
              <div className="brand">
                <div className="logo">Agregar integrantes</div>
                <div className="subtitle">Buscá y sumá personas a "{title}"</div>
              </div>
              <button type="button" className="close" onClick={() => { setShowAddMemberModal(false); setJustAdded(new Set()); }} aria-label="Cerrar"><FiX /></button>
            </header>
            <div className="ccBody">
              <div className="searchRow" style={{ marginBottom: '16px' }}>
                <div className="field">
                  <FiSearch className="ico" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <div className="usersList" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {loadingCandidates && (
                  <div style={{ position: 'relative', minHeight: 100 }}>
                    <GlobalLoader size={60} />
                  </div>
                )}
                {!loadingCandidates && allCandidates.length === 0 && (
                  <div className="placeholder">No se encontraron usuarios disponibles.</div>
                )}
                {!loadingCandidates && allCandidates
                  .filter(u => {
                    if (!searchQuery) return true
                    const q = searchQuery.toLowerCase()
                    const dn = (displayName(u) || '').toLowerCase()
                    const em = (u.email || '').toLowerCase()
                    return dn.includes(q) || em.includes(q)
                  })
                  .slice(0, 50)
                  .map(u => {
                    const isM = u.isMember || justAdded.has(Number(u.id))
                    return (
                      <button
                        key={u.id}
                        className={`userRow ${isM ? 'isMember' : ''}`}
                        onClick={!isM ? () => onAddMemberToChannel(u.id) : undefined}
                        disabled={addingMember && !isM}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          width: '100%',
                          padding: '10px',
                          borderRadius: '12px',
                          marginBottom: '8px',
                          textAlign: 'left',
                          opacity: (addingMember && !isM) ? 0.6 : 1
                        }}
                      >
                        <div className="avaWrapper" style={{ position: 'relative', marginRight: '12px' }}>
                          <Avatar src={u.avatar_url} name={displayName(u)} size={32} />
                          <AttendanceBadge modalidad={getModalidad(statuses, u.id_feder || u.feder_id || u.feder?.id || u.user?.feder?.id)} size={12} />
                        </div>
                        <div className="meta" style={{ flex: 1 }}>
                          <div className="name" style={{ fontWeight: 700, color: '#fff' }}>{displayName(u)}</div>
                          <div className="email" style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{u.email}</div>
                        </div>
                        {isM ? (
                          <FiCheck className="addIcon" style={{ fontSize: '1.2rem' }} />
                        ) : (
                          <FiPlus className="addIcon" />
                        )}
                      </button>
                    )
                  })}
              </div>
            </div>
            <footer className="ccFooter">
              <button className="btn" onClick={() => { setShowAddMemberModal(false); setJustAdded(new Set()); }}>
                Cerrar
              </button>
            </footer>
          </div>
        </div>,
        document.body
      )}



    </>
  )
}
