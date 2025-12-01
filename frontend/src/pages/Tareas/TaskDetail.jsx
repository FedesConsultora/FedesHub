import React, { useEffect, useMemo, useState, useCallback, useRef} from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FaArrowLeft } from 'react-icons/fa'
import { tareasApi } from '../../api/tareas'
import TaskStatusCard from '../../components/tasks/TaskStatusCard'
import TaskHeaderActions from '../../components/tasks/TaskHeaderActions'
import AssignedPeople from '../../components/tasks/AssignedPeople'
import LabelChip from '../../components/common/LabelChip'
import TaskComments from '../../components/tasks/comments'
import TaskAttachments from '../../components/tasks/TaskAttachments.jsx'
import TaskChecklist from '../../components/tasks/TaskChecklist.jsx'
import { useModal } from '../../components/modal/ModalProvider.jsx'
import SubtasksPanel from '../../components/tasks/SubtasksPanel.jsx'
import ParticipantsEditor from '../../components/tasks/ParticipantsEditor.jsx'
import useContentEditable from '../../hooks/useContentEditable'
import { useToast } from '../../components/toast/ToastProvider.jsx'
import { MdKeyboardArrowDown } from 'react-icons/md'
import { FaRegSave } from "react-icons/fa";
import { MdAddComment } from "react-icons/md";

import './task-detail.scss'


/* === helpers fecha === */
const toInputDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth()+1).padStart(2,'0')
  const dd = String(d.getDate()).padStart(2,'0')
  return `${yyyy}-${mm}-${dd}`
}
const fromInputDate = (val) => {
  if (!val) return null
  // set local a 23:59:59 para evitar TZ raras si mostramos solo fecha
  const [y,m,d] = val.split('-').map(Number)
  const dt = new Date(y, m-1, d, 23, 59, 59)
  return dt.toISOString()
}

export default function TaskDetail({ taskId, onUpdated, onClose}){
  const { id } = useParams()
  const navigate = useNavigate()
  const modal = useModal()
  const toast = useToast()

  const [task, setTask] = useState(null)
  const [catalog, setCatalog] = useState(null)
  const [tab, setTab] = useState('desc')
    const [form, setForm] = useState({ titulo:'', descripcion:'' })
  const [saving, setSaving] = useState(false)
const [peopleForm, setPeopleForm] = useState({
  responsables: [],
  colaboradores: []
});
  const [showCommentsPopup, setShowCommentsPopup] = useState(false);

const handlePeopleChange = async ({ responsables, colaboradores }) => {
  // Actualización optimista en UI
  setTask(t => ({
    ...t,
    responsables,
    colaboradores
  }));

  try {
    const respIds = responsables.map(p => p.id ?? p.feder_id);
    const colIds  = colaboradores.map(p => p.id ?? p.feder_id);

    await tareasApi.update(taskId, {
      responsables_ids: respIds,
      colaboradores_ids: colIds
    });

    toast?.success("Participantes actualizados");
  } catch (e) {
    toast?.error(e?.message || "No se pudieron actualizar los participantes");
  }
};


  const firstLoad = useRef(true);

useEffect(() => {
  if (!task) return;

  setPeopleForm({
    responsables: mapResp(task.responsables || task.Responsables || []),
    colaboradores: mapCol(task.colaboradores || task.Colaboradores || [])
  });
}, [task]);



  // contentEditable
  const titleCE = useContentEditable({
    value: form.titulo,
    onChange: (v) => setForm(f => (f.titulo === v ? f : { ...f, titulo: v }))
  })
  const descCE = useContentEditable({
    value: form.descripcion,
    onChange: (v) => setForm(f => (f.descripcion === v ? f : { ...f, descripcion: v }))
  })

  // cargar
  const reload = useCallback(async () => {
    const [t, cat] = await Promise.all([
      tareasApi.get(taskId),
      
      tareasApi.catalog().catch(() => ({}))
      
    ])

    setTask(t)
    setCatalog(cat || {})
    setForm({ titulo: t?.titulo || '', descripcion: t?.descripcion || '' })
    document.title = `${t?.titulo || 'Tarea'}`
  }, [id])

  useEffect(() => { (async()=>{ await reload() })() }, [reload])

  // dirty
  const dirty = useMemo(() => {
    if (!task) return false
    const t = (form.titulo ?? '').trim()
    const d = (form.descripcion ?? '')
    return t !== (task.titulo ?? '').trim() || d !== (task.descripcion ?? '')
  }, [form, task])

  // autosave (debounce)
  const saveIfDirty = useCallback(async (source='auto') => {
    if (!dirty || !task || saving) return
    const patch = {}
    const currTitulo = (form.titulo ?? '').trim()
    const currDesc   = (form.descripcion ?? '')
    if (currTitulo !== (task.titulo ?? '').trim()) patch.titulo = currTitulo
    if (currDesc   !== (task.descripcion ?? ''))   patch.descripcion = currDesc
    if (!Object.keys(patch).length) return

    try{
      setSaving(true)
      const next = await tareasApi.update(id, patch)
      setTask(next)
      setForm({ titulo: next?.titulo || '', descripcion: next?.descripcion || '' })
      toast?.success(source === 'auto' ? 'Cambios guardados' : 'Guardado')
    }catch(e){
      toast?.error(e?.message || 'No se pudo guardar')
    } finally { setSaving(false) }
  }, [dirty, form, taskId, task, saving, toast])

  // dispara cada vez que cambia título/desc (debounce 800ms)
  useEffect(() => {
    if (!task) return
    const t = setTimeout(() => saveIfDirty('auto'), 800)
    return () => clearTimeout(t)
  }, [form.titulo, form.descripcion, task, saveIfDirty])

  // forzar guardado al salir del campo
  const flushOnBlur = () => saveIfDirty('blur')

  // beforeunload
  useEffect(() => {
    const onBeforeUnload = (e) => { if (dirty) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const handleBack = async () => {
    if (dirty) {
      const ok = await modal.confirm({
        title: 'Cambios sin guardar',
        message: 'Tenés cambios sin guardar. ¿Salir igualmente?',
        okText: 'Salir sin guardar',
        cancelText: 'Volver'
      })
      if (!ok) return
    }
    navigate(-1)
  }

  // estado
  const handleEstado = async (estado_id) => {
    const next = await tareasApi.setEstado(taskId, estado_id)
    setTask(next)
  }

  if (!task) return <div className="taskDetail"><div className="card">Cargando…</div></div>

  // normalización
  const estadoCodigo   = task?.estado?.codigo || task?.estado_codigo || 'pendiente'
  const aprobLabel     = task?.aprobacionEstado?.nombre || task?.aprobacion_estado_nombre || null
  const etiquetas      = task?.etiquetas || []
  const clienteNombre  = task?.cliente?.nombre || task?.cliente_nombre || '—'
  const hitoNombre     = task?.hito?.nombre || task?.hito_nombre || null
  const vencimientoISO = task?.vencimiento || null
  const progreso       = Number(task?.progreso_pct) || 0
  const prioridad      = task?.prioridad_num

  const mapResp = (arr=[]) => arr.map(r => r?.feder ? ({ ...r.feder, es_lider: !!r.es_lider, avatar_url: r.feder.avatar_url || null }) : r)
  const mapCol  = (arr=[]) => arr.map(c => c?.feder ? ({ ...c.feder, rol: c.rol ?? null, avatar_url: c.feder.avatar_url || null }) : c)
  const responsables  = mapResp(task?.Responsables || task?.responsables || [])
  const colaboradores = mapCol (task?.Colaboradores || task?.colaboradores || [])

  const isFavorita = !!(task.is_favorita || task.favorita)
  const isSeguidor = !!(task.is_seguidor || task.seguidor)

  const fmtDate = (d) => { try { return new Date(d).toLocaleDateString() } catch { return '' } }

  // === vencimiento en línea (con aprobación si aplica) ===
  const handleDueChange = async (inputValue) => {
    const iso = fromInputDate(inputValue)  // puede ser null
    try{
      const next = await tareasApi.update(taskId, { vencimiento: iso })
      setTask(next)
      toast?.success('Vencimiento actualizado')
    }catch(e1){
      try{
        await tareasApi.setAprobacion(taskId, { tipo:'vencimiento', vencimiento: iso })
        const next = await tareasApi.get(taskId)
        setTask(next)
        toast?.success('Solicitud de cambio enviada para aprobación')
      }catch(e2){
        toast?.error(e2?.message || e1?.message || 'No se pudo actualizar el vencimiento')
      }
    }
  }

  // === cliente en línea (sin aprobación porque el backend no lo soporta) ===
  const handleClientChange = async (nextClienteId) => {
    const currentId = task?.cliente?.id ?? task?.cliente_id ?? null
    const hasValue = nextClienteId !== undefined && nextClienteId !== null && String(nextClienteId) !== ''
    const cid = hasValue ? Number(nextClienteId) : null

    // si eligieron vacío, no mandamos nada (el backend no acepta null)
    if (cid === null) {
      toast?.error('No se puede dejar la tarea sin cliente.')
      return
    }

    // si no cambió, nada que hacer
    if (currentId === cid) return

    try {
      const next = await tareasApi.update(taskId, { cliente_id: cid })
      setTask(next)
      toast?.success('Cliente actualizado')
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'No se pudo actualizar el cliente'
      toast?.error(msg)
    }
  }




  return (
    <div className="taskDetail">
      {/* === Estados + Volver === */}
  

      {/* === Header sticky === */}
      <div className="taskHeader">
        <div className="titleWrap">
          <div>
            {/* Título (autosave) */}
            <div
              className="ttl editable"
              data-placeholder="Escribí un título…"
              contentEditable
              suppressContentEditableWarning
              spellCheck={false}
              role="textbox"
              aria-label="Título de la tarea"
              ref={titleCE.ref}
              onInput={titleCE.handleInput}
              onBlur={flushOnBlur}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}
              onPaste={(e) => {
                e.preventDefault()
                const txt = (e.clipboardData?.getData('text/plain') ?? '').replace(/\n/g, ' ')
                document.execCommand?.('insertText', false, txt)
              }}
            />
            
          </div>
          {/* <div className="chips">
            {etiquetas.slice(0,6).map(e => <LabelChip key={e.id||e.codigo} label={e} />)}
          </div> */}
          <div className="meta">
             <span className="inlineDue">
                <InlineDue
                  value={toInputDate(vencimientoISO)}
                  onChange={handleDueChange}
                />
        </span>
              <TaskStatusCard
              estadoCodigo={estadoCodigo}
              progresoPct={progreso}
              aprobLabel={aprobLabel}
              prioridad={prioridad}
              vencimientoISO={vencimientoISO}
              etiquetas={etiquetas}
              estadosCatalog={catalog?.estados || catalog?.tareaEstados || []}
              onPick={handleEstado}
        />
              <span className="inlineClient">
                
                <InlineClient
                  valueId={task?.cliente?.id || task?.cliente_id || null}
                  valueName={clienteNombre}
                  options={catalog?.clientes || catalog?.clients || []}
                onChange={handleClientChange}
                
                />
              </span>

              {hitoNombre && <span><b>Hito</b> {hitoNombre}</span>}

             
          {/* Acciones derechas: sólo acciones rápidas */}
        <div className="actions">
          <TaskHeaderActions
            isFavorita={isFavorita}
            isSeguidor={isSeguidor}
            onToggleFav={async on => setTask(await tareasApi.toggleFavorito(id, on))}
            onToggleFollow={async on => setTask(await tareasApi.toggleSeguidor(id, on))}
            onRelate={() => alert('Abrir modal de relaciones (WIP)')}
            onQuickAttach={() => document.querySelector('input[type=file]')?.click()}
          />
            </div>
          
      </div>
        </div>
          
      

        
    
      

      
      </div>

      {/* === Layout === */}
      <div className="grid">
        {/* LEFT */}
        <div className="left">
          <div className="card" style={{minHeight:'300px'}}>
            <div className="cardHeader">
              <div className="desc">
                  <p>Descripción</p>
                {/* <button className={`fh-chip ${tab==='childs'?'primary':''}`} onClick={()=>setTab('childs')}>Tareas hijas</button> */}
              </div>
            </div>

            {tab === 'desc' ? (
              // Descripción (autosave)
              <div
                className="txt editable"
                style={{minHeight:'190px'}}
                data-placeholder="Escribí la descripción…"
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-label="Descripción de la tarea"
                ref={descCE.ref}
                onInput={descCE.handleInput}
                onBlur={flushOnBlur}
                onPaste={(e) => {
                  e.preventDefault()
                  const txt = e.clipboardData?.getData('text/plain') ?? ''
                  document.execCommand?.('insertText', false, txt)
                }}
              />
            ) : (
              <SubtasksPanel
                parentId={Number(taskId)}
                defaultClienteId={task?.cliente_id || task?.cliente?.id || null}
                catalog={catalog}
              />
            )}
          </div>
            <TaskAttachments
            taskId={Number(taskId)}
            onAfterChange={async () => {
              try { setTask(await tareasApi.get(taskId)) } catch {}
            }}
          />

          <div className='historial-section'>
            <div>SECCIÓN HISTORIAL</div>
          </div>

         
        </div>

        {/* RIGHT */}
        <div className="right" style={{alignItems:'center', position:'relative'}}>
          <div className='dropzone'>
            <p>DROPZONE</p>
            <MdAddComment
              size={30}
              className="commentsToggleBtn"
              onClick={() => setShowCommentsPopup(v => !v)} />
    
      
            
              
   
          
          
          </div>
          {/* === Panel de comentarios === */}
          {showCommentsPopup && (
    <div className="comments"
         style={{
           position: 'absolute',
           top: 42,
           right: 0,
           height: 'calc(100% - 48px)'
         }}
    >
      <TaskComments taskId={Number(taskId)} catalog={catalog} />
    </div>
  )}
        
        </div>

          {/* <TaskChecklist
            style={{display: 'none'}}
            taskId={Number(taskId)}
            onAfterChange={async () => {
              try {
                const next = await tareasApi.get(taskId)
                setTask(next)
                const estadoCodigo = next?.estado?.codigo || next?.estado_codigo
                const pct = Number(next?.progreso_pct) || 0
                if (pct === 100 && estadoCodigo !== 'finalizada') {
                  const ok = await modal.confirm({
                    title: 'Checklist completo',
                    message: 'El checklist está al 100%. ¿Marcar la tarea como finalizada?',
                    okText: 'Finalizar',
                    cancelText: 'Mantener en curso'
                  })
                  if (ok) {
                    const catEstados = catalog?.estados || catalog?.tareaEstados || []
                    const finalId = catEstados.find(e => e.codigo === 'finalizada')?.id
                    if (finalId) setTask(await tareasApi.setEstado(taskId, finalId))
                  }
                }
              } catch {}
            }}
          /> */}

         

      </div>
       <div className='people-detail'>
          {/* <button  onClick={()=>setEditPeople(false)}>Ver</button>
          <button  onClick={()=>setEditPeople(true)}>Editar</button> */}
          
            <AssignedPeople
                
                  responsables={peopleForm.responsables}
  colaboradores={peopleForm.colaboradores}
  candidatesResp={catalog?.feders || []}
  candidatesCol={catalog?.feders || []}
  onChange={async (next) => {
    setPeopleForm(next);            // actualiza la UI inmediatamente
    await handlePeopleChange(next); // guarda en backend
  }}
   />
         
        
        <button
          style={{alignSelf:'flex-end', marginBottom: '1rem'}}
  className="saveBtn"
  disabled={saving}
  // onClick={async () => {
  //   try {
  //     setSaving(true)
  //     await tareasApi.updatePeople(taskId, peopleForm)
  //     setTask(await tareasApi.get(taskId))
  //     toast?.success('Cambios guardados')
  //   } catch(e) {
  //     toast?.error(e?.message || 'No se pudo guardar')
  //   } finally {
  //     setSaving(false)
  //   }
  // }}
>
          <FaRegSave size={ 22} style={{cursor: 'pointer', position:'relative', top:'.3rem'}} color='#489FD4' /> Guardar cambios
</button>
      </div>
    
     
    </div>
  )
}

/* === componente inline para fecha === */
function InlineDue({ value, onChange }){
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState(value || '')
  useEffect(()=>{ setLocal(value || '') }, [value])

  if (!editing){
    return (
      <button className="dueChip" type="button" onClick={()=>setEditing(true)} title="Editar fecha de vencimiento">
        {value ? new Date(value).toLocaleDateString() : 'Sin fecha'}
      </button>
    )
  }
  return (
    <input
      className="dueInput"
      type="date"
      value={local}
      onChange={e=>setLocal(e.target.value)}
      onBlur={() => { setEditing(false); onChange?.(local) }}
      onKeyDown={(e)=>{ if(e.key==='Enter'){ e.currentTarget.blur() } }}
      autoFocus
    />
  )
}

/* === componente inline para cliente === */
function InlineClient({ valueId=null, valueName='', options=[], onChange }){
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState(valueId ?? '')
  useEffect(() => { setLocal(valueId ?? '') }, [valueId])

  const opts = useMemo(
    () => (options || []).slice().sort((a,b)=>
      String(a?.nombre||'').localeCompare(String(b?.nombre||''))),
    [options]
  )

  if (!editing) {
    
    return (
      <>
      <button
        className="clientChip"
        type="button"
        onClick={()=>setEditing(true)}
        title="Cambiar cliente"
      >
          {valueName || 'Sin cliente'}  <MdKeyboardArrowDown style={ {position:'relative', top: '2px'}} />
      </button>
     
      </>
    )
  }

  return (
    <select
      className="clientSelect"
      value={local ?? ''}
      onChange={e => setLocal(e.target.value || '')}
      onBlur={() => { setEditing(false); onChange?.(local || null) }}
      onKeyDown={(e)=>{ if(e.key==='Enter'){ e.currentTarget.blur() } }}
      autoFocus
    >
      {opts.map(c => (
        <option key={c.id} value={c.id}>{c.nombre}</option>
      ))}
    </select>
  )
}
