import { useEffect, useMemo, useState } from 'react'
import * as A from '../../api/auth'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import FormRow from '../../components/ui/FormRow'
import { useAuthCtx } from '../../context/AuthContext'
import './Admin.scss'

export default function Users() {
  const { hasPerm } = useAuthCtx()
  const canAssign = hasPerm('auth','assign')

  const [rows, setRows] = useState([])
  const [roles, setRoles] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [openNew, setOpenNew] = useState(false)
  const [newData, setNewData] = useState({ email:'', password:'', roles:[], is_activo:true })

  const [editing, setEditing] = useState(null) // {id, roles:[]}

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const [{ data: users }, { data: roles }] = await Promise.all([A.adminListUsers(q), A.adminListRoles()])
      setRows(users || [])
      setRoles(roles || [])
    } catch (e) {
      setError(e?.fh?.message || 'Error cargando usuarios')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const columns = useMemo(() => ([
    { key:'email', header:'Email' },
    { key:'is_activo', header:'Activo', render:r => <span>{r.is_activo ? 'Sí' : 'No'}</span> },
    { key:'roles', header:'Roles', render:r => (r.roles || []).map(x => x.nombre).join(', ') },
    canAssign ? { key:'actions', header:'Acciones', render:r => (
      <div style={{display:'flex', gap:8}}>
        <button onClick={()=>setEditing({ id:r.id, email:r.email, roles:(r.roles||[]).map(x=>x.nombre) })}>Editar roles</button>
        <button onClick={async ()=>{
          try { await A.adminPatchUserActive(r.id, !r.is_activo); load() } catch(e) { alert(e?.fh?.message || 'Error') }
        }}>{r.is_activo ? 'Desactivar' : 'Activar'}</button>
      </div>
    )} : null,
  ].filter(Boolean)), [canAssign])

  const toggleSel = (name, list, setter) => setter(list.includes(name) ? list.filter(n=>n!==name) : [...list, name])

  const createUser = async () => {
    try {
      await A.adminCreateUser(newData)
      setOpenNew(false); setNewData({ email:'', password:'', roles:[], is_activo:true })
      load()
    } catch (e) { alert(e?.fh?.message || 'No se pudo crear') }
  }

  const saveRoles = async () => {
    try {
      await A.adminPatchUserRoles(editing.id, editing.roles)
      setEditing(null); load()
    } catch (e) { alert(e?.fh?.message || 'No se pudo actualizar') }
  }

  return (
    <section className="card">
      <h2>Usuarios</h2>
      <div className="toolbar">
        <input placeholder="Buscar..." value={q} onChange={e=>setQ(e.target.value)} />
        <button onClick={load}>Buscar</button>
        {canAssign && <button className="primary" onClick={()=>setOpenNew(true)}>+ Nuevo</button>}
      </div>

      {error && <div className="error">{error}</div>}
      {loading ? <div>Cargando…</div> : (
        <Table columns={columns} rows={rows} keyField="id" empty="Sin usuarios" />
      )}

      <Modal open={openNew} title="Nuevo usuario" onClose={()=>setOpenNew(false)} footer={
        <><button onClick={()=>setOpenNew(false)}>Cancelar</button><button className="primary" onClick={createUser}>Crear</button></>
      }>
        <FormRow label="Email"><input value={newData.email} onChange={e=>setNewData(v=>({...v, email:e.target.value}))} placeholder="usuario@fedes.ai" /></FormRow>
        <FormRow label="Contraseña"><input type="password" value={newData.password} onChange={e=>setNewData(v=>({...v, password:e.target.value}))} /></FormRow>
        <FormRow label="Activo">
          <select value={String(newData.is_activo)} onChange={e=>setNewData(v=>({...v, is_activo: e.target.value==='true'}))}>
            <option value="true">Sí</option><option value="false">No</option>
          </select>
        </FormRow>
        <div className="chipset">
          {(roles||[]).map(r => (
            <button key={r.id}
              className={newData.roles.includes(r.nombre) ? 'chip active' : 'chip'}
              onClick={()=>toggleSel(r.nombre, newData.roles, (x)=>setNewData(v=>({...v, roles:x})))}
            >{r.nombre}</button>
          ))}
        </div>
      </Modal>

      <Modal open={!!editing} title={`Editar roles: ${editing?.email || ''}`} onClose={()=>setEditing(null)} footer={
        <><button onClick={()=>setEditing(null)}>Cancelar</button><button className="primary" onClick={saveRoles}>Guardar</button></>
      }>
        <div className="chipset">
          {(roles||[]).map(r => (
            <button key={r.id}
              className={editing?.roles?.includes(r.nombre) ? 'chip active' : 'chip'}
              onClick={()=>setEditing(ed => ({...ed, roles: ed.roles.includes(r.nombre) ? ed.roles.filter(n=>n!==r.nombre) : [...ed.roles, r.nombre]}))}
            >{r.nombre}</button>
          ))}
        </div>
      </Modal>
    </section>
  )
}
