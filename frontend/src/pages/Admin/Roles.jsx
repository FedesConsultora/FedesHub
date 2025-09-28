// /frontend/src/pages/Admin/Roles.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as A from '../../api/auth'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import FormRow from '../../components/ui/FormRow'
import './Admin.scss'
import './roles.page.scss'                             // ⬅️ estilos propios de la página
import { useToast } from '../../components/toast/ToastProvider.jsx'
import { useModal } from '../../components/modal/ModalProvider.jsx' // ⬅️ provider nuevo

export default function Roles() {
  document.title = 'FedesHub — Roles'
  const nav = useNavigate()
  const toast = useToast()
  const modal = useModal()

  const [rows, setRows] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ nombre:'', descripcion:'' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true); setError(null)
    try { const { data } = await A.adminListRoles(); setRows(data||[]) }
    catch(e){ setError(e?.fh?.message || 'Error cargando roles') }
    finally{ setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const columns = [
    { key:'nombre', header:'Nombre' },
    { key:'descripcion', header:'Descripción' },
    { key:'actions', header:'', render:r => (
      <div className="row-actions">
        <button onClick={()=>nav(`/admin/roles/${r.id}`)} title="Permisos del rol">Permisos</button>
        <button onClick={()=>{ setForm({ ...r }); setOpen(true) }} title="Editar">Editar</button>
        <button
          title="Eliminar"
          onClick={async ()=>{
            const ok = await modal.confirm({
              title: 'Eliminar rol',
              message: `¿Eliminar “${r.nombre}”? Esta acción no se puede deshacer.`,
              tone: 'danger',
              okText: 'Eliminar',
              cancelText: 'Cancelar'
            })
            if (!ok) return
            try { await A.adminDeleteRole(r.id); toast?.success('Rol eliminado'); load() }
            catch(e){ toast?.error(e?.fh?.message||'Error') }
          }}
        >Eliminar</button>
      </div>
    )},
  ]

  const save = async () => {
    try {
      if (!form.nombre?.trim()) { toast?.warn('Nombre requerido'); return; }
      if (form.id) await A.adminUpdateRole(form.id, { nombre: form.nombre.trim(), descripcion: form.descripcion || null })
      else await A.adminCreateRole({ nombre: form.nombre.trim(), descripcion: form.descripcion || null })
      toast?.success('Guardado')
      setOpen(false); setForm({ nombre:'', descripcion:'' }); load()
    } catch(e){ toast?.error(e?.fh?.message || 'No se pudo guardar') }
  }

  return (
    <section className="roles-page">
      <div className="toolbar only-actions">
        <button className="primary" onClick={()=>{ setForm({ nombre:'', descripcion:'' }); setOpen(true) }}>
          + Nuevo rol
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="tableWrap">
        {loading ? <div className="loading">Cargando…</div> :
          <Table columns={columns} rows={rows} keyField="id" empty="Sin roles" />
        }
      </div>

      <Modal
        open={open}
        title={form.id ? 'Editar rol' : 'Nuevo rol'}
        onClose={()=>setOpen(false)}
        footer={
          <>
            <button onClick={()=>setOpen(false)}>Cancelar</button>
            <button className="primary" onClick={save}>Guardar</button>
          </>
        }
      >
        {/* Wrapper para estilos consistentes dentro del modal */}
        <div className="roles-modal">
          <FormRow label="Nombre">
            <input required title="Nombre del rol" value={form.nombre}
                   onChange={e=>setForm(v=>({...v, nombre:e.target.value}))} />
          </FormRow>
          <FormRow label="Descripción">
            <input title="Descripción" value={form.descripcion||''}
                   onChange={e=>setForm(v=>({...v, descripcion:e.target.value}))} />
          </FormRow>
        </div>
      </Modal>
    </section>
  )
}
