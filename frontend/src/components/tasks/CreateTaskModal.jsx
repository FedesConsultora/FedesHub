import { useEffect, useMemo, useRef, useState, useId } from 'react'
import { tareasApi } from '../../api/tareas'
import useTaskCatalog from '../../hooks/useTaskCatalog'
import { FiFlag, FiBriefcase, FiHash, FiTag, FiUsers, FiX, FiUpload, FiHelpCircle } from 'react-icons/fi'
import { MdKeyboardArrowDown } from "react-icons/md";

import './CreateTask.scss'

/* ================= util: click afuera ================= */
function useClickOutside(ref, onOutside){
  useEffect(() => {
    const on = (e) => { if (ref.current && !ref.current.contains(e.target)) onOutside?.() }
    document.addEventListener('mousedown', on)
    document.addEventListener('touchstart', on)
    return () => { document.removeEventListener('mousedown', on); document.removeEventListener('touchstart', on) }
  }, [ref, onOutside])
}

/* ================= Multiselect accesible ================= */
function MultiSelect({
  id,
  labelId,
  leftIcon = null,
  options = [],
  value = [],
  onChange,
  placeholder = 'Seleccionar…',
  disabled = false,
}) {
  const rid = useId()
  const controlId = id || `ms-${rid}`
  const listboxId = `${controlId}-listbox`

  // ⬅️ clave: envolvemos trigger + panel
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
    const s = String(val)
    const next = value.includes(s) ? value.filter(v => v !== s) : [...value, s]
    onChange?.(next)
  }

  const labelsByVal = useMemo(() => {
    const m = new Map()
    options.forEach(o => m.set(String(o.value), o.label))
    return m
  }, [options])

  const selectedLabels = value.map(v => labelsByVal.get(String(v))).filter(Boolean)
  const summary =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length <= 2
        ? selectedLabels.join(', ')
        : `${selectedLabels.slice(0, 2).join(', ')} +${selectedLabels.length - 2}`

  const filtered = q.trim()
    ? options.filter(o => o.label.toLowerCase().includes(q.trim().toLowerCase()))
    : options

  return (
    <div className="msWrap" ref={wrapRef} style={{ width: '100%' }}>
      {/* Trigger: click/Enter/Espacio -> toggle. Si estaba abierto, se cierra. */}
      <div
        id={controlId}
        className="field"
        style={S.field}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-labelledby={labelId}
        tabIndex={0}
        onClick={() => !disabled && setOpen(o => !o)}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o) }
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
      {value.map(val => {
        const v = String(val)
        const label = labelsByVal.get(v)
        if (!label) return null
        return (
          <div className="tag" key={v} role="button" tabIndex={0}
               onKeyDown={(e) => { if (e.key === 'Backspace' || e.key === 'Delete') toggleVal(v) }}
               onClick={(e) => { e.stopPropagation(); /* opcional: toggleVal(v) para remover al click */ }}>
            {label}
          </div>
        )
      })}
    </div>
  )}
</div>

        <div className="addon" style={S.addon}>
          <MdKeyboardArrowDown/>
        </div>
      </div>

      {open && !disabled && (
        <div className="msPanel" id={listboxId} role="listbox" aria-multiselectable="true">
          <div className="msSearch">
            <div className="selected-tags">
  {value.length === 0 && (
    <span className="placeholder">{placeholder}</span>
  )}

  {value.map((opt) => (
    <div className="tag" key={opt.value}>
      {opt.label}
    </div>
  ))}
</div>

          </div>
          <ul>
            {filtered.map(opt => {
              const val = String(opt.value)
              const checked = value.includes(val)
              return (
                <li key={val}>
                  <label className="msRow">
                    <input type="checkbox" checked={checked} onChange={() => toggleVal(val)} />
                    <span className="ellipsis">{opt.label}</span>
                  </label>
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


/* ====== Estilos inline críticos de layout/ancho ====== */
const S = {
  // field base: icono izquierda + control que ocupa 100%
  field: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '14px 14px', borderRadius: 12,
    border: '1px solid rgba(255,255,255,.12)',
    background: '#0f141b', boxSizing: 'border-box', width: '100%',
  },
  fieldArea: { alignItems: 'flex-start' },
  fieldCheckbox: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 14px', borderRadius: 12,
    border: '1px solid rgba(255,255,255,.12)', background: '#0f141b'
  },
  ico: { flex: '0 0 22px', width: 22, height: 22, opacity: .85 },
  control: { flex: '1 1 auto', minWidth: 0, width: '100%' },
  addon: { flex: '0 0 22px', width: 22, height: 22, color: 'white' },

  datesRow: { display:'flex', gap:10, width:'100%' },
  dateCell: { display:'flex', alignItems:'center', gap:8, flex:1 },


 
  fileName: { overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'normal' },

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

  const hitosOpts = useMemo(() => {
    if (!clienteId) return []
    return (cat.hitos || []).filter(h => String(h.cliente_id) === String(clienteId))
  }, [cat.hitos, clienteId])
  useEffect(() => { setHitoId('') }, [clienteId])

  // Validaciones
  const tituloError = useMemo(() => {
    if (!titulo) return null
    const t = titulo.trim()
    if (t.length < 3) return 'Min. 3'
    if (t.length > 200) return 'Máx. 200'
    return null
  }, [titulo])
  const fechaError = useMemo(() => {
    if (!fechaInicio || !vencimiento) return null
    return new Date(vencimiento) < new Date(fechaInicio)
      ? 'El vencimiento no puede ser anterior al inicio' : null
  }, [fechaInicio, vencimiento])

  const canSubmit = !!clienteId && !!titulo.trim() && !tituloError && !fechaError && !loading

  // Enter para enviar
  useEffect(() => {
    const f = formRef.current; if (!f) return
    const onKey = (ev) => { if (ev.key === 'Enter' && canSubmit) f.requestSubmit() }
    f.addEventListener('keydown', onKey); return () => f.removeEventListener('keydown', onKey)
  }, [canSubmit])

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
  const humanSize = (n=0) => (n>=1024*1024 ? `${(n/1024/1024).toFixed(1)} MB` : n>=1024 ? `${(n/1024).toFixed(1)} KB` : `${n} B`)
  const fileSummary = files.length === 0
    ? 'Sin archivos seleccionados'
    : files.length === 1
      ? files[0].name
      : `${files[0].name}, +${files.length-1}`

  // Opciones
  const federsOpts = useMemo(() => (cat.feders || []).map(f => {
    const label = `${f.apellido ?? ''} ${f.nombre ?? ''}`.trim() || f.alias || `Feder #${f.id}`
    return { value: String(f.id), label }
  }), [cat.feders])
  const etiquetasOpts = useMemo(() => (cat.etiquetas || []).map(et => ({ value: String(et.id), label: et.nombre })), [cat.etiquetas])

  // IDs de labels para accesibilidad y click-to-open
  const lblEtiquetasId = 'lbl-etiquetas'
  const lblRespsId     = 'lbl-resps'
  const lblColabsId    = 'lbl-colabs'

  return (
    <div className="taskModalWrap" role="dialog" aria-modal="true" aria-label="Crear tarea">
      <form ref={formRef} className="tcCard" onSubmit={onSubmit} noValidate>
        <header className="tcHeader">
          <div className="brand">
            <div className="logo">Nueva tarea</div>
            
          </div>
          <button type="button" className="close" onClick={onClose} aria-label="Cerrar"><FiX/></button>
        </header>

        <div className="tcBody">
          <div className="tcGrid">
            {/* Columna izquierda */}
            <div className="col">
            
              <div className={'field ' + (!clienteId ? 'is-error' : '')} style={S.field}>
                <FiBriefcase className="ico" aria-hidden style={S.ico}/>
                <select
                  id="cliente" ref={firstFieldRef} value={clienteId}
                  onChange={(e)=>setClienteId(e.target.value)} disabled={loading}
                  style={S.control} aria-invalid={!clienteId}
                >
                  <option value="">Cliente</option>
                  {(cat.clientes || []).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <div className="addon" style={S.addon}/>
              </div>

              {hitosOpts.length > 0 && (
                <>
                  <label className="lbl" htmlFor="hito">Hito</label>
                  <div className="field" style={S.field}>
                    <FiHash className="ico" aria-hidden style={S.ico}/>
                    <select id="hito" value={hitoId} onChange={(e)=>setHitoId(e.target.value)}
                            disabled={loading} style={S.control}>
                      <option value="">— Ninguno —</option>
                      {hitosOpts.map(h => <option key={h.id} value={h.id}>{h.nombre}</option>)}
                    </select>
                    <div className="addon" style={S.addon}/>
                  </div>
                </>
              )}
                {/* Deadline + Responsables / */}
             

            
              {(cat.feders || []).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem',  maxWidth: '100%',
                }}>
                <div className={'field ' + (fechaError ? 'is-error' : '')} style={{width: '50%'}}>
                <div style={S.control}>
                  <div style={S.datesRow}>
                    
                    <div style={S.dateCell}>
                      <span style={{fontFamily:'inherit', color:'#FFFFFF8C'}}>Deadline</span>
                      <input type="date" value={vencimiento} label='Deadline'
                        onChange={(e)=>setVencimiento(e.target.value)} disabled={loading} style={{flex:0.9,minWidth:0}}/>
                    </div>
                  </div>
                </div>
              </div>
              {fechaError && <div className="help error-inline">{fechaError}</div>}
                  <div style={{ width: '50%'}}>
                    <MultiSelect
                      id="ms-resps"
                      labelId={lblRespsId}
                      leftIcon={<FiUsers className="ico" aria-hidden style={S.ico} />}
                      options={federsOpts}
                      value={responsables}
                      onChange={setResponsables}
                      placeholder="Responsables"
                      disabled={loading}
                    />
                  </div>

                     
                    </div>

              )}
                {/* Colaboradores */}
 {(cat.feders || []).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'row',   maxWidth: '100%',
                }}>
                  
                      <div style={{ width: '100%'   }}>
                        <MultiSelect
                          id="ms-colabs"
                          labelId={lblColabsId}
                          leftIcon={<FiUsers className="ico" aria-hidden style={S.ico} />}
                          options={federsOpts}
                          value={colaboradores}
                          onChange={setColaboradores}
                          placeholder="Asignar a"
                          disabled={loading}
                        />
                  </div>
                  
                    </div>

              )}

              {/* 
                  <label className="lbl" htmlFor="leader">Líder</label>
                  <div className="field" style={S.field}>
                    <FiUsers className="ico" aria-hidden style={S.ico}/>
                    <select id="leader" value={leaderId} onChange={(e)=>setLeaderId(e.target.value)}
                            disabled={loading || responsables.length === 0} style={S.control}>
                      <option value="">— Ninguno —</option>
                      {responsables.map(fid => {
                        const f = (cat.feders || []).find(x => String(x.id) === String(fid))
                        const name = f ? (`${f.apellido ?? ''} ${f.nombre ?? ''}`.trim() || f.alias || `Feder #${f.id}`) : `Feder #${fid}`
                        return <option key={fid} value={String(fid)}>{name}</option>
                      })}
                    </select>
                    <div className="addon" aria-hidden style={S.addon}/>
                  </div> */}

         
              <div className={'field ' + (tituloError ? 'is-error' : '')} style={S.field}>
                <FiFlag className="ico" aria-hidden style={S.ico}/>
                <input
                  id="titulo" type="text" placeholder=" Título - Ej. Implementar integración con Google"
                  value={titulo} onChange={(e)=>setTitulo(e.target.value)} maxLength={220}
                  disabled={loading} style={S.control} aria-invalid={!!tituloError}
                />
                <div className="addon"  style={S.addon}/>
              </div>

          
              <div className="field area" style={{...S.field, ...S.fieldArea}}>
                <FiTag className="ico" aria-hidden style={{...S.ico, alignSelf:'flex-start'}}/>
                <textarea
                  id="desc" rows={6} placeholder="Descripción de la tarea" 
                  value={descripcion} onChange={(e)=>setDescripcion(e.target.value)}
                  disabled={loading} style={S.control} 
                />
              </div>

            
            </div>

            {/* Columna derecha */}
            
            <div className="col">
               
              <div className={"field upload-files"} style={S.field}>
             
                <label htmlFor="files">
                Carga de Archivos</label>
                <span>Arrastra un archivo para cargarlo</span>
                <div className='upload-btn'
    >
                <input
                  id="files" ref={fileInputRef} type="file" multiple
                  onChange={(e)=>setFiles(Array.from(e.target.files || []))}
                  disabled={loading}
                  style={{position:'absolute', opacity:0, pointerEvents:'none', width:0, height:0}}
                />
                <div className="filePicker" style={S.control}>
                  <button type="button" className="fileBtn" onClick={()=>fileInputRef.current?.click()} disabled={loading}>
                    Elegir archivos
                  </button>
                  <span className="fileSummary ellipsis" title={files.map(f=>f.name).join(', ')}>
                    {fileSummary}
                  </span>
                  </div>
                  </div>
                <div className="addon" style={S.addon} />
              </div>

            {files?.length > 0 && (
  <div className="filesList" style={S.filesList}>
    {files.map((f, i) => {
      const isImage = f.type.startsWith('image/');
      const previewUrl = isImage ? URL.createObjectURL(f) : null;

      return (
    <div key={i} className="fileRow" style={{ ...S.fileRow, display:'flex', alignItems:'center', gap: '0.5rem' }}>
  {isImage && (
    <img 
      src={previewUrl} 
      alt={f.name} 
      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} 
    />
  )}
  <div style={{ display:'flex', flexDirection:'column', width: '100px', flexShrink:0, minWidth: 0, paddingBottom:' 1rem'}}>
    <span
      className="FileName"
      style={{ ...S.fileName, color:'#fff', textOverflow:'ellipsis', whiteSpace:'nowrap' }}
      title={f.name}
    >
      {f.name}
    </span>
    <span
      className='fileSize'
      style={{ color:'#a9b7c7', fontSize:'.88rem', textOverflow:'ellipsis', whiteSpace:'nowrap' }}
    >
      {humanSize(f.size)}
    </span>
  </div>
</div>

      )
    })}
  </div>
)}

              {/* {(cat.impactos || []).length > 0 && (
                <>
                  <label className="lbl" htmlFor="impacto">Impacto</label>
                  <div className="field" style={S.field}>
                    <FiTag className="ico" aria-hidden style={S.ico}/>
                    <select id="impacto" value={impactoId} onChange={(e)=>setImpactoId(e.target.value)}
                            disabled={loading} style={S.control}>
                      <option value="">— Por defecto —</option>
                      {(cat.impactos || []).map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                    </select>
                    <div className="addon" aria-hidden style={S.addon}/>
                  </div>
                </>
              )} */}

              {/* {(cat.urgencias || []).length > 0 && (
                <>
                  <label className="lbl" htmlFor="urgencia">Urgencia</label>
                  <div className="field" style={S.field}>
                    <FiTag className="ico" aria-hidden style={S.ico}/>
                    <select id="urgencia" value={urgenciaId} onChange={(e)=>setUrgenciaId(e.target.value)}
                            disabled={loading} style={S.control}>
                      <option value="">— Automática —</option>
                      {(cat.urgencias || []).map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                    <div className="addon" aria-hidden style={S.addon}/>
                  </div>
                </>
              )} */}

          
              {/* Etiquetas */}
              {/* {(cat.etiquetas || []).length > 0 && (
                <>
                  <label
                    className="lbl"
                    id={lblEtiquetasId}
                    onMouseDown={(e)=>{ e.preventDefault(); document.getElementById('ms-etiquetas')?.click() }}
                  >
                    Etiquetas
                  </label>
                  <MultiSelect
                    id="ms-etiquetas"
                    labelId={lblEtiquetasId}
                    leftIcon={<FiTag className="ico" aria-hidden style={S.ico}/>}
                    options={etiquetasOpts}
                    value={etiquetas}
                    onChange={setEtiquetas}
                    placeholder="Seleccionar etiquetas…"
                    disabled={loading}
                  />
                </>
              )} */}

           

              {/* Aprobación */}
              <div className="field checkbox" style={S.fieldCheckbox}>
                <input id="aprob" type="checkbox" checked={requiereAprob}
                       onChange={(e)=>setRequiereAprob(e.target.checked)} disabled={loading}/>
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
