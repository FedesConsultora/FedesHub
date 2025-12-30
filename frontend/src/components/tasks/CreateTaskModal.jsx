import { useEffect, useMemo, useRef, useState, useId } from 'react'
import { tareasApi } from '../../api/tareas'
import useTaskCatalog from '../../hooks/useTaskCatalog'
import { FiFlag, FiBriefcase, FiHash, FiTag, FiUsers, FiX, FiUpload, FiHelpCircle } from 'react-icons/fi'
import { MdKeyboardArrowDown } from "react-icons/md";
import AttendanceBadge from '../common/AttendanceBadge.jsx'
import useAttendanceStatus, { getModalidad } from '../../hooks/useAttendanceStatus.js'
import RichTextEditor from '../common/RichTextEditor.jsx'

import './CreateTask.scss'

/* ================= util: click afuera ================= */
function useClickOutside(ref, onOutside) {
  useEffect(() => {
    const on = (e) => { if (ref.current && !ref.current.contains(e.target)) onOutside?.() }
    document.addEventListener('mousedown', on)
    document.addEventListener('touchstart', on)
    return () => { document.removeEventListener('mousedown', on); document.removeEventListener('touchstart', on) }
  }, [ref, onOutside])
}

/* ================= CustomSelect (Single/Multi) ================= */
function CustomSelect({
  id,
  labelId,
  leftIcon = null,
  options = [],
  value = [], // always array internally for consistency
  onChange,
  placeholder = 'Seleccionar…',
  disabled = false,
  multi = true,
  renderLabel = null,
  isOptionDisabled = null
}) {
  const rid = useId()
  const controlId = id || `ms-${rid}`
  const listboxId = `${controlId}-listbox`

  const wrapRef = useRef(null)
  useClickOutside(wrapRef, () => setOpen(false))

  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [])

  const toggleVal = (val) => {
    if (disabled) return
    const opt = optionsByVal.get(String(val))
    if (isOptionDisabled?.(opt)) return

    const s = String(val)
    if (multi) {
      const next = value.includes(s) ? value.filter(v => v !== s) : [...value, s]
      onChange?.(next)
    } else {
      onChange?.([s])
      setOpen(false) // Close on single selection
    }
  }

  const optionsByVal = useMemo(() => {
    const m = new Map()
    options.forEach(o => m.set(String(o.value), o))
    return m
  }, [options])

  const selectedLabels = value.map(v => optionsByVal.get(String(v))?.label).filter(Boolean)

  const filtered = q.trim()
    ? options.filter(o => o.label.toLowerCase().includes(q.trim().toLowerCase()))
    : options

  return (
    <div className="msWrap" ref={wrapRef} style={{ width: '100%' }}>
      {/* Trigger */}
      <div
        id={controlId}
        className={`field ${open ? 'is-open' : ''}`}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-labelledby={labelId}
        tabIndex={0}
        onClick={() => !disabled && setOpen(o => !o)}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o) }
          if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setOpen(true) }
        }}
      >
        {leftIcon}
        <div
          className={'msDisplay ' + (selectedLabels.length ? 'selected-labels' : 'placeholder')}
          style={{ flex: '1 1 auto', minWidth: 0 }}
        >
          {selectedLabels.length === 0 ? (
            <span className="msPlaceholder">{placeholder}</span>
          ) : (
            <div className="selected-tags" onClick={(e) => e.stopPropagation()}>
              {!multi ? (
                // Single select display
                <div className="single-val">
                  {renderLabel ? renderLabel(optionsByVal.get(String(value[0]))) : selectedLabels[0]}
                </div>
              ) : (
                // Multi select tags
                value.map(val => {
                  const v = String(val)
                  const opt = optionsByVal.get(v)
                  if (!opt) return null
                  return (
                    <div className="tag" key={v} role="button" tabIndex={0}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      onKeyDown={(e) => { if (e.key === 'Backspace' || e.key === 'Delete') toggleVal(v) }}
                    >
                      {renderLabel ? renderLabel(opt) : opt.label}
                      <FiX size={12} className="remove-tag" onClick={(e) => { e.stopPropagation(); toggleVal(v) }} />
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>

        <div className="addon" style={S.addon}>
          <MdKeyboardArrowDown className={`chevron ${open ? 'open' : ''}`} />
        </div>
      </div>

      {open && !disabled && (
        <div className="msPanel" id={listboxId} role="listbox" aria-multiselectable={multi}>
          {options.length > 8 && (
            <div className="msSearch">
              <input
                type="text"
                placeholder="Buscar..."
                value={q}
                onChange={e => setQ(e.target.value)}
                onClick={e => e.stopPropagation()}
                autoFocus
              />
            </div>
          )}
          <ul>
            {filtered.map(opt => {
              const val = String(opt.value)
              const checked = value.includes(val)
              const isLocked = isOptionDisabled?.(opt)

              return (
                <li key={val} onClick={(e) => { e.stopPropagation(); !isLocked && toggleVal(val) }}>
                  <div className={`msRow ${checked ? 'selected' : ''} ${isLocked ? 'disabled' : ''}`}>
                    {multi && <input type="checkbox" checked={checked} readOnly disabled={isLocked} />}
                    <div className="msRowContent">
                      {renderLabel ? renderLabel(opt) : <span className="ellipsis">{opt.label}</span>}
                    </div>
                  </div>
                </li>
              )
            })}
            {!filtered.length && <li className="msEmpty">Sin resultados</li>}
          </ul>
        </div>
      )}
    </div>
  )
}


/* ====== Estilos inline mínimos ====== */
const S = {
  ico: { flex: '0 0 20px', width: 20, height: 20, opacity: .7 },
  control: { flex: '1 1 auto', minWidth: 0, width: '100%' },
  addon: { flex: '0 0 22px', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  datesRow: { display: 'flex', gap: 6, width: '100%' },
  dateCell: { display: 'flex', alignItems: 'center', gap: 8, flex: 1 },
  fileName: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal' },
}

export default function CreateTaskModal({ onClose, onCreated }) {
  const { data: cat, loading, error } = useTaskCatalog()
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef(null)
  const firstFieldRef = useRef(null)

  const [clienteId, setClienteId] = useState('')
  const [hitoId, setHitoId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [impactoId, setImpactoId] = useState('')
  const [urgenciaId, setUrgenciaId] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [vencimiento, setVencimiento] = useState('')
  const [requiereAprob, setRequiereAprob] = useState(false)

  const [etiquetas, setEtiquetas] = useState([])
  const [responsables, setResponsables] = useState([])
  const [leaderId, setLeaderId] = useState('')
  const [colaboradores, setColaboradores] = useState([])

  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [apiError, setApiError] = useState(null)

  // Attendance status hook
  const allFederIds = useMemo(() => (cat.feders || []).map(f => f.id), [cat.feders])
  const { statuses } = useAttendanceStatus(allFederIds)

  const hitosOpts = useMemo(() => {
    if (!clienteId) return []
    return (cat.hitos || []).filter(h => String(h.cliente_id) === String(clienteId))
  }, [cat.hitos, clienteId])
  useEffect(() => { setHitoId('') }, [clienteId])

  const lblClienteId = 'lbl-cliente'

  // Validaciones
  const tituloError = useMemo(() => {
    if (!titulo) return null
    const t = titulo.trim()
    if (t.length < 3) return 'Min. 3'
    if (t.length > 200) return 'Máx. 200'
    return null
  }, [titulo])
  const fechaError = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (fechaInicio && new Date(fechaInicio) < today) {
      return 'La fecha de inicio no puede ser anterior a hoy';
    }
    if (vencimiento && new Date(vencimiento) < today) {
      return 'El vencimiento no puede ser anterior a hoy';
    }
    if (fechaInicio && vencimiento && new Date(vencimiento) < new Date(fechaInicio)) {
      return 'El vencimiento no puede ser anterior al inicio';
    }
    return null;
  }, [fechaInicio, vencimiento])

  const canSubmit = !!clienteId && !!titulo.trim() && !tituloError && !fechaError && !loading

  // No enviar por Enter (evitar cierre accidental)

  // foco + escape
  useEffect(() => {
    firstFieldRef.current?.focus?.()
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // líder debe ser uno de responsables
  useEffect(() => {
    if (leaderId && !responsables.includes(String(leaderId))) setLeaderId(responsables[0] || '')
  }, [responsables, leaderId])

  // Si alguien se vuelve responsable, lo quitamos de colaboradores si estaba
  useEffect(() => {
    if (responsables.length > 0) {
      const respId = responsables[0]
      if (colaboradores.includes(respId)) {
        setColaboradores(prev => prev.filter(id => id !== respId))
      }
    }
  }, [responsables])

  const parseNumOrNull = (v) => (v === '' || v == null ? null : Number(v))

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setApiError(null)

    const respsPayload = responsables.map(fid => ({ feder_id: Number(fid), es_lider: String(fid) === String(leaderId) }))
    const colabsPayload = colaboradores.map(fid => ({ feder_id: Number(fid), rol: null }))

    const body = {
      cliente_id: Number(clienteId),
      hito_id: parseNumOrNull(hitoId),
      titulo: titulo.trim(),
      descripcion: descripcion?.trim() || null,
      impacto_id: parseNumOrNull(impactoId) || undefined,
      urgencia_id: parseNumOrNull(urgenciaId) || undefined,
      fecha_inicio: new Date().toISOString() || undefined,
      vencimiento: vencimiento || undefined,
      requiere_aprobacion: !!requiereAprob,
      etiquetas: etiquetas.map(id => Number(id)),
      responsables: respsPayload,
      colaboradores: colabsPayload,
    }

    try {
      setSubmitting(true)
      const created = await tareasApi.create(body)
      if (files?.length) {
        setUploading(true)
        const updated = await tareasApi.uploadAdjuntos(created.id, files)
        setUploading(false)
        onCreated?.(updated)
      } else {
        onCreated?.(created)
      }
    } catch (err) {
      setApiError(err?.fh?.message || 'No se pudo crear la tarea')
    } finally {
      setSubmitting(false); setUploading(false)
    }
  }

  // archivos (UI)
  const fileInputRef = useRef(null)
  const humanSize = (n = 0) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`)
  const fileSummary = files.length === 0
    ? 'Sin archivos seleccionados'
    : files.length === 1
      ? files[0].name
      : `${files[0].name}, +${files.length - 1}`

  // Opciones
  const federsOpts = useMemo(() => (cat.feders || []).map(f => {
    const label = `${f.apellido ?? ''} ${f.nombre ?? ''}`.trim() || f.alias || `Feder #${f.id}`
    return { value: String(f.id), label, feder_id: f.id }
  }), [cat.feders])
  const etiquetasOpts = useMemo(() => (cat.etiquetas || []).map(et => ({ value: String(et.id), label: et.nombre })), [cat.etiquetas])

  const renderFederLabel = (opt) => {
    if (!opt) return null
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', verticalAlign: 'middle' }}>
        <span>{opt.label}</span>
        <div className="badge-wrapper" style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '14px',
          height: '14px',
          position: 'relative'
        }}>
          <AttendanceBadge modalidad={getModalidad(statuses, opt.feder_id)} size={14} inline />
        </div>
      </div>
    )
  }

  // IDs de labels para accesibilidad y click-to-open
  const lblEtiquetasId = 'lbl-etiquetas'
  const lblRespsId = 'lbl-resps'
  const lblColabsId = 'lbl-colabs'

  return (
    <div className="taskModalWrap" role="dialog" aria-modal="true" aria-label="Crear tarea">
      <form ref={formRef} className="tcCard" onSubmit={onSubmit} noValidate>
        <header className="tcHeader">
          <div className="brand">
            <div className="logo">Nueva tarea</div>

          </div>
          <button type="button" className="close" onClick={onClose} aria-label="Cerrar"><FiX /></button>
        </header>

        <div className="tcBody">
          <div className="tcGrid">
            {/* Columna izquierda */}
            <div className="col">



              <CustomSelect
                id="ms-cliente"
                labelId={lblClienteId}
                leftIcon={<FiBriefcase className="ico" aria-hidden style={S.ico} />}
                options={(cat.clientes || []).map(c => ({ value: String(c.id), label: c.nombre }))}
                value={clienteId ? [String(clienteId)] : []}
                onChange={(next) => {
                  const first = (next && next.length) ? String(next[next.length - 1]) : ''
                  setClienteId(first)
                }}
                placeholder="Clientes"
                disabled={loading}
                multi={false}
              />

              <div className="addon" style={S.addon} />




              {hitosOpts.length > 0 && (
                <div className="field">
                  <FiHash className="ico" aria-hidden style={S.ico} />
                  <select id="hito" value={hitoId} onChange={(e) => setHitoId(e.target.value)}
                    disabled={loading} style={S.control}>
                    <option value="">— Hito —</option>
                    {hitosOpts.map(h => <option key={h.id} value={h.id}>{h.nombre}</option>)}
                  </select>
                  <div className="addon" style={S.addon}><MdKeyboardArrowDown /></div>
                </div>
              )}
              {/* Deadline + Responsable (solo uno) */}



              {(cat.feders || []).length > 0 && (
                <div style={{
                  display: 'flex', flexDirection: 'row', gap: '0.5rem', maxWidth: '100%'
                }}>
                  <div className={'field ' + (fechaError ? 'is-error' : '')} style={{ width: '50%' }}>
                    <div style={S.control}>
                      <div style={S.datesRow}>

                        <div style={S.dateCell}>
                          <span style={{ fontFamily: 'inherit', color: '#FFFFFF8C' }}>Deadline</span>
                          <input type="date" value={vencimiento} label='Deadline'
                            onChange={(e) => setVencimiento(e.target.value)} disabled={loading} style={{ flex: 0.9, minWidth: 0 }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  {fechaError && <div className="help error-inline">{fechaError}</div>}
                  <div style={{ width: '50%' }}>
                    <CustomSelect
                      id="responsable"
                      labelId={lblRespsId}
                      leftIcon={<FiUsers className="ico" aria-hidden style={S.ico} />}
                      options={federsOpts}
                      value={responsables}
                      onChange={setResponsables}
                      placeholder="Seleccionar responsable"
                      disabled={loading}
                      multi={false}
                      renderLabel={renderFederLabel}
                    />
                  </div>


                </div>

              )}
              {/* Colaboradores */}
              {(cat.feders || []).length > 0 && (
                <div style={{
                  display: 'flex', flexDirection: 'row', maxWidth: '100%',
                }}>

                  <div style={{ width: '100%' }}>
                    <CustomSelect
                      id="ms-colabs"
                      labelId={lblColabsId}
                      leftIcon={<FiUsers className="ico" aria-hidden style={S.ico} />}
                      options={federsOpts}
                      value={colaboradores}
                      onChange={setColaboradores}
                      placeholder="Asignar a"
                      disabled={loading}
                      multi={true}
                      renderLabel={renderFederLabel}
                      isOptionDisabled={(opt) => responsables.includes(String(opt.value))}
                    />
                  </div>

                </div>

              )}


              <label className="lbl" htmlFor="leader" style={{ display: 'none' }}>Líder</label>
              <div className="field" style={{ display: 'none' }}>
                <FiUsers className="ico" aria-hidden style={S.ico} />
                <select id="leader" value={leaderId} onChange={(e) => setLeaderId(e.target.value)}
                  disabled={loading || responsables.length === 0} style={S.control}>
                  <option value="">— Ninguno —</option>
                  {responsables.map(fid => {
                    const f = (cat.feders || []).find(x => String(x.id) === String(fid))
                    const name = f ? (`${f.apellido ?? ''} ${f.nombre ?? ''}`.trim() || f.alias || `Feder #${f.id}`) : `Feder #${fid}`
                    return <option key={fid} value={String(fid)}>{name}</option>
                  })}
                </select>
                <div className="addon" aria-hidden style={S.addon} />
              </div>


              <div className={'field ' + (tituloError ? 'is-error' : '')}>
                <FiFlag className="ico" aria-hidden style={S.ico} />
                <input
                  id="titulo" type="text" placeholder=" Título - Ej. Implementar integración con Google"
                  value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={220}
                  disabled={loading} style={S.control} aria-invalid={!!tituloError}
                />
              </div>


              <div className="tcEditorLabel">Descripción</div>
              <RichTextEditor
                value={descripcion}
                onChange={setDescripcion}
                placeholder="Descripción de la tarea - Ej. Detalles de la implementación..."
                taskId={null}
                maxLength={3600}
                minHeight="200px"
              />


            </div>

            {/* Columna derecha */}

            <div className="col">

              <div className={"field upload-files"}>

                <label htmlFor="files">
                  Carga de Archivos</label>
                <span>Arrastra un archivo para cargarlo</span>
                <div className='upload-btn'
                >
                  <input
                    id="files" ref={fileInputRef} type="file" multiple
                    onChange={(e) => setFiles(Array.from(e.target.files || []))}
                    disabled={loading}
                    style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
                  />
                  <div className="filePicker" style={S.control}>
                    <button type="button" className="fileBtn" onClick={() => fileInputRef.current?.click()} disabled={loading}>
                      Elegir archivos
                    </button>

                  </div>
                </div>
                <div className="addon" style={S.addon} />
                {files?.length > 0 && (
                  <div className="filesList" style={S.filesList}>
                    {files.map((f, i) => {
                      const isImage = f.type.startsWith('image/');
                      const previewUrl = isImage ? URL.createObjectURL(f) : null;

                      return (
                        <div key={i} className="fileRow" style={{ position: 'relative' }} >
                          <button
                            type="button"
                            onClick={() => {
                              const newFiles = [...files];
                              newFiles.splice(i, 1);
                              setFiles(newFiles);
                            }}
                            style={{
                              position: 'absolute',
                              top: 1,
                              right: 4,
                              width: 12,
                              height: 12,
                              padding: 0,
                              paddingBottom: '0.3rem',
                              borderRadius: "50%",
                              background: '#9F1B1B',
                              color: '#fff',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',

                              zIndex: 10,
                              overflow: 'visible',

                            }}
                          >
                            x
                          </button>
                          {isImage && (
                            <img
                              src={previewUrl}
                              alt={f.name}
                              style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                            />
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', width: '100px', flexShrink: 0, minWidth: 0, paddingBottom: ' 1rem' }}>
                            <span
                              className="FileName"
                              style={{ ...S.fileName, color: '#fff', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              title={f.name}
                            >
                              {f.name}
                            </span>
                            <span
                              className='fileSize'
                              style={{ color: '#a9b7c7', fontSize: '.88rem', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              {humanSize(f.size)}
                            </span>
                          </div>
                        </div>

                      )
                    })}
                  </div>
                )}
              </div>



              {/* {(cat.impactos || []).length > 0 && (
                <div className="field">
                  <FiTag className="ico" aria-hidden style={S.ico}/>
                  <select id="impacto" value={impactoId} onChange={(e)=>setImpactoId(e.target.value)}
                          disabled={loading} style={S.control}>
                    <option value="">— Impacto —</option>
                    {(cat.impactos || []).map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                  </select>
                  <div className="addon" style={S.addon}><MdKeyboardArrowDown /></div>
                </div>
              )} */}

              {/* {(cat.urgencias || []).length > 0 && (
                <div className="field">
                  <FiTag className="ico" aria-hidden style={S.ico}/>
                  <select id="urgencia" value={urgenciaId} onChange={(e)=>setUrgenciaId(e.target.value)}
                          disabled={loading} style={S.control}>
                    <option value="">— Urgencia —</option>
                    {(cat.urgencias || []).map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                  </select>
                  <div className="addon" style={S.addon}><MdKeyboardArrowDown /></div>
                </div>
              )} */}


              {/* {(cat.etiquetas || []).length > 0 && (
                <CustomSelect
                  id="ms-etiquetas"
                  labelId={lblEtiquetasId}
                  leftIcon={<FiTag className="ico" aria-hidden style={S.ico}/>}
                  options={etiquetasOpts}
                  value={etiquetas}
                  onChange={setEtiquetas}
                  placeholder="Etiquetas"
                  disabled={loading}
                  multi={true}
                />
              )} */}



              {/* Aprobación */}
              <div className="field checkbox" style={{ display: 'none' }}>
                <input id="aprob" type="checkbox" checked={requiereAprob}
                  onChange={(e) => setRequiereAprob(e.target.checked)} disabled={loading} />
                <label htmlFor="aprob">Requiere aprobación</label>
              </div>
            </div>
          </div>

          {error && <div className="error" role="alert">Error cargando catálogos.</div>}
          {apiError && <div className="error" role="alert">{apiError}</div>}
        </div>

        <footer className="tcFooter">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="submit" disabled={!canSubmit || submitting || uploading}>
            {uploading ? 'Subiendo adjuntos…' : (submitting ? 'Creando…' : 'Crear tarea')}
          </button>
        </footer>
      </form>
    </div>
  )
}

