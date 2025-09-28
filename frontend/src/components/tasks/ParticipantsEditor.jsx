import React, { useMemo, useState } from 'react'
import { FaCrown, FaPlus, FaTimes, FaChevronDown } from 'react-icons/fa'
import { tareasApi } from '../../api/tareas'
import Avatar from '../Avatar.jsx'
import { useToast } from '../toast/ToastProvider.jsx'
import './participants-editor.scss'

function byName(a, b){
  const an = ((a.nombre||'') + ' ' + (a.apellido||'')).trim().toLowerCase()
  const bn = ((b.nombre||'') + ' ' + (b.apellido||'')).trim().toLowerCase()
  return an.localeCompare(bn)
}

const MAX_CANDIDATES = 5

export default function ParticipantsEditor({
  taskId,
  responsables = [],
  colaboradores = [],
  feders = [],
  onChange
}){
  const toast = useToast()

  // acordeones
  const [openResp, setOpenResp] = useState(false)
  const [openCol, setOpenCol]   = useState(false)

  // búsqueda + ver más
  const [qResp, setQResp] = useState('')
  const [qCol,  setQCol]  = useState('')
  const [moreResp, setMoreResp] = useState(false)
  const [moreCol,  setMoreCol]  = useState(false)

  const respIds = useMemo(()=> new Set(responsables.map(r => r.id || r.feder_id)), [responsables])
  const colIds  = useMemo(()=> new Set(colaboradores.map(c => c.id || c.feder_id)), [colaboradores])

  const allRespCandidates = useMemo(() =>
    (feders||[])
      .filter(f => !respIds.has(f.id))
      .filter(f => ((f.nombre||'') + ' ' + (f.apellido||'')).toLowerCase().includes(qResp.toLowerCase()))
      .sort(byName)
  , [feders, respIds, qResp])

  const allColCandidates = useMemo(() =>
    (feders||[])
      .filter(f => !colIds.has(f.id) && !respIds.has(f.id))
      .filter(f => ((f.nombre||'') + ' ' + (f.apellido||'')).toLowerCase().includes(qCol.toLowerCase()))
      .sort(byName)
  , [feders, respIds, colIds, qCol])

  const candidatesResp = moreResp ? allRespCandidates : allRespCandidates.slice(0, MAX_CANDIDATES)
  const candidatesCol  = moreCol  ? allColCandidates  : allColCandidates.slice(0, MAX_CANDIDATES)

  const currentLeaderId =
    (responsables.find(r => r.es_lider)?.id) || (responsables.find(r=>r.es_lider)?.feder_id) || null

  // === acciones ===
  const addResp = async (fid, es_lider=false) => {
    try{ await tareasApi.addResp(taskId, fid, es_lider); toast?.success('Responsable agregado'); await onChange?.() }
    catch(e){ toast?.error(e?.message || 'No se pudo agregar') }
  }

  const removeResp = async (fid) => {
    try{ await tareasApi.delResp(taskId, fid); toast?.success('Responsable quitado'); await onChange?.() }
    catch(e){ toast?.error(e?.message || 'No se pudo quitar') }
  }

  const markLeader = async (fid) => {
    try{
      // si tenés un endpoint exclusivo, usalo; si no, esto actualiza el flag del elegido
      if (tareasApi.setRespLeader) await tareasApi.setRespLeader(taskId, fid)
      else await tareasApi.addResp(taskId, fid, true)
      toast?.success('Líder actualizado'); await onChange?.()
    }catch(e){ toast?.error(e?.message || 'No se pudo cambiar el líder') }
  }

  const addCol = async (fid) => {
    try{ await tareasApi.addColab(taskId, fid, null); toast?.success('Colaborador agregado'); await onChange?.() }
    catch(e){ toast?.error(e?.message || 'No se pudo agregar') }
  }

  const removeCol = async (fid) => {
    try{ await tareasApi.delColab(taskId, fid); toast?.success('Colaborador quitado'); await onChange?.() }
    catch(e){ toast?.error(e?.message || 'No se pudo quitar') }
  }

  const updateColRol = async (fid, rol) => {
    try{ await tareasApi.addColab(taskId, fid, (rol ?? '').trim() || null); toast?.success('Rol actualizado'); await onChange?.() }
    catch(e){ toast?.error(e?.message || 'No se pudo actualizar el rol') }
  }

  const AvatarRow = ({items=[]}) => (
    <div className="pe-avatars">
      {items.slice(0,6).map((p,i) => {
        const full = [p.nombre,p.apellido].filter(Boolean).join(' ') || '—'
        return <Avatar key={p.id||p.feder_id||i} src={p.avatar_url||undefined} name={full} size={28} usePlaceholder={false}/>
      })}
      {items.length>6 && <span className="pe-more">+{items.length-6}</span>}
    </div>
  )

  return (
    <div className="participantsEditor">
      {/* ===== RESPONSABLES (acordeón) ===== */}
      <section className="pe-accordion">
        <button
          className="pe-headBtn"
          onClick={()=>setOpenResp(v=>!v)}
          aria-expanded={openResp}
        >
          <div className="pe-title">
            <span>Responsables</span>
            <span className="pe-count">{responsables.length}</span>
          </div>
          <AvatarRow items={responsables}/>
          <FaChevronDown className="chev" />
        </button>

        {openResp && (
          <div className="pe-body">
            <div className="pe-addRow">
              <input value={qResp} onChange={e=>setQResp(e.target.value)} placeholder="Buscar feder para agregar…" />
              <div className="pe-candidates">
                {candidatesResp.map(f => {
                  const full = [f.nombre, f.apellido].filter(Boolean).join(' ') || '—'
                  return (
                    <button key={f.id} className="pe-candidate" onClick={()=>addResp(f.id,false)} title="Agregar responsable">
                      <Avatar src={f.avatar_url||undefined} name={full} size={24} usePlaceholder={false}/>
                      <span>{full}</span> <FaPlus/>
                    </button>
                  )
                })}
                {allRespCandidates.length > MAX_CANDIDATES && (
                  <button className="pe-moreBtn" onClick={()=>setMoreResp(v=>!v)}>
                    {moreResp ? 'Ver menos' : `Ver todos (${allRespCandidates.length})`}
                  </button>
                )}
                {allRespCandidates.length===0 && <span className="muted">No hay candidatos</span>}
              </div>
            </div>

            <div className="pe-list">
              {responsables.length ? responsables.map(r => {
                const fid = r.id || r.feder_id
                const full = [r.nombre, r.apellido].filter(Boolean).join(' ') || r.name || '—'
                const isLeader = currentLeaderId === fid
                return (
                  <div key={fid} className="pe-item dense">
                    <Avatar src={r.avatar_url||undefined} name={full} size={32} usePlaceholder={false}/>
                    <div className="pe-info">
                      <div className="pe-name">{full}</div>
                    </div>
                    <div className="pe-actions">
                      <button
                        className={`leaderToggle ${isLeader ? 'on' : ''}`}
                        onClick={()=>markLeader(fid)}
                        title="Marcar como líder"
                      >
                        <FaCrown className="crown"/> <span>Líder</span>
                      </button>
                      <button className="link danger" onClick={()=>removeResp(fid)}><FaTimes/> Quitar</button>
                    </div>
                  </div>
                )
              }) : <div className="empty">Sin responsables</div>}
            </div>
          </div>
        )}
      </section>

      {/* ===== COLABORADORES (acordeón) ===== */}
      <section className="pe-accordion">
        <button
          className="pe-headBtn"
          onClick={()=>setOpenCol(v=>!v)}
          aria-expanded={openCol}
        >
          <div className="pe-title">
            <span>Colaboradores</span>
            <span className="pe-count">{colaboradores.length}</span>
          </div>
          <AvatarRow items={colaboradores}/>
          <FaChevronDown className="chev" />
        </button>

        {openCol && (
          <div className="pe-body">
            <div className="pe-addRow">
              <input value={qCol} onChange={e=>setQCol(e.target.value)} placeholder="Buscar feder para agregar…" />
              <div className="pe-candidates">
                {candidatesCol.map(f => {
                  const full = [f.nombre, f.apellido].filter(Boolean).join(' ') || '—'
                  return (
                    <button key={f.id} className="pe-candidate" onClick={()=>addCol(f.id)} title="Agregar colaborador">
                      <Avatar src={f.avatar_url||undefined} name={full} size={24} usePlaceholder={false}/>
                      <span>{full}</span> <FaPlus/>
                    </button>
                  )
                })}
                {allColCandidates.length > MAX_CANDIDATES && (
                  <button className="pe-moreBtn" onClick={()=>setMoreCol(v=>!v)}>
                    {moreCol ? 'Ver menos' : `Ver todos (${allColCandidates.length})`}
                  </button>
                )}
                {allColCandidates.length===0 && <span className="muted">No hay candidatos</span>}
              </div>
            </div>

            <div className="pe-list">
              {colaboradores.length ? colaboradores.map(c => {
                const fid = c.id || c.feder_id
                const full = [c.nombre, c.apellido].filter(Boolean).join(' ') || c.name || '—'
                return (
                  <div key={fid} className="pe-item dense">
                    <Avatar src={c.avatar_url||undefined} name={full} size={32} usePlaceholder={false}/>
                    <div className="pe-info">
                      <div className="pe-name">{full}</div>
                    </div>
                    <div className="pe-actions">
                      <input
                        className="pe-rol"
                        placeholder="Rol (opcional)…"
                        defaultValue={c.rol || ''}
                        onBlur={e => {
                          const next = e.target.value
                          if ((next||'') !== (c.rol||'')) updateColRol(fid, next)
                        }}
                      />
                      <button className="link danger" onClick={()=>removeCol(fid)}><FaTimes/> Quitar</button>
                    </div>
                  </div>
                )
              }) : <div className="empty">Sin colaboradores</div>}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}