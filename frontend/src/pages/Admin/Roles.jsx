import { useEffect, useState } from 'react'
import * as A from '../../api/auth'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import FormRow from '../../components/ui/FormRow'
import { useNavigate } from 'react-router-dom'
import './Admin.scss'

export default function Roles() {
  const nav = useNavigate()
  const [rows, setRows] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ nombre:'', descripcion:'' })
  const [error, setError] = useState(null)
  const load = async () => {
    try { const { data } = await A.adminListRoles(); setRows(data||[]) }
    catch(e){ setError(e?.fh?.message || 'Error cargando roles') }
  }
  useEffect(() => { load() }, [])

  const columns = [
    { key:'nombre', header:'Nombre' },
    { key:'descripcion', header:'Descripción' },
    { key:'actions', header:'', render:r => (
      <div style={{display:'flex', gap:8}}>
        <button onClick={()=>nav(`/admin/roles/${r.id}`)}>Permisos</button>
        <button onClick={()=>{ setForm({ ...r }); setOpen(true) }}>Editar</button>
        <button onClick={async ()=>{ if(!confirm('Eliminar rol?'))return; try{ await A.adminDeleteRole(r.id); load() }catch(e){ alert(e?.fh?.message||'Error') }}}>Eliminar</button>
      </div>
    )},
  ]

  const save = async () => {
    try {
      if (form.id) await A.adminUpdateRole(form.id, { nombre: form.nombre, descripcion: form.descripcion })
      else await A.adminCreateRole(form)
      setOpen(false); setForm({ nombre:'', descripcion:'' }); load()
    } catch(e){ alert(e?.fh?.message || 'No se pudo guardar') }
  }

  return (
    <section className="card">
      <h2>Roles</h2>
      {error && <div className="error">{error}</div>}
      <div className="toolbar">
        <button className="primary" onClick={()=>{ setForm({ nombre:'', descripcion:'' }); setOpen(true) }}>+ Nuevo rol</button>
      </div>
      <Table columns={columns} rows={rows} keyField="id" empty="Sin roles" />

      <Modal open={open} title={form.id ? 'Editar rol' : 'Nuevo rol'} onClose={()=>setOpen(false)} footer={
        <><button onClick={()=>setOpen(false)}>Cancelar</button><button className="primary" onClick={save}>Guardar</button></>
      }>
        <FormRow label="Nombre"><input value={form.nombre} onChange={e=>setForm(v=>({...v, nombre:e.target.value}))} /></FormRow>
        <FormRow label="Descripción"><input value={form.descripcion||''} onChange={e=>setForm(v=>({...v, descripcion:e.target.value}))} /></FormRow>
      </Modal>
    </section>
  )
}
