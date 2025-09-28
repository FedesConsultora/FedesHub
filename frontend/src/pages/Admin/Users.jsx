// /frontend/src/pages/Admin/Users.jsx
import { useEffect, useMemo, useState } from 'react'
import * as A from '../../api/auth'
import Table from '../../components/ui/Table'
import './Admin.scss'
import './users.page.scss'
import UserCreateModal from './modals/UserCreateModal.jsx'
import UserEditModal from './modals/UserEditModal.jsx'
import { useToast } from '../../components/toast/ToastProvider.jsx'
import { useModal } from '../../components/modal/ModalProvider.jsx'
import SearchBar from '../../components/common/SearchBar.jsx'

export default function Users() {
  document.title = 'FedesHub — Usuarios'
  const toast = useToast()
  const modal = useModal()

  const [rows, setRows] = useState([])
  const [roles, setRoles] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [openNew, setOpenNew] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const [{ data: users }, { data: rs }] = await Promise.all([A.adminListUsers(q), A.adminListRoles()])
      setRows(users || []); setRoles(rs || [])
    } catch (e) {
      setError(e?.fh?.message || e?.message || 'Error cargando usuarios')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const columns = useMemo(() => ([
    { key:'email', header:'Email' },
    { key:'is_activo', header:'Activo', render:r =>
        <span className={`badge ${r.is_activo ? 'ok' : 'off'}`}>{r.is_activo ? 'Sí' : 'No'}</span> },
    { key:'roles', header:'Roles', render:r => (r.roles || []).map(x => x.nombre).join(', ') },
    { key:'actions', header:'', render:r => (
      <div className="row-actions">
        <button onClick={()=>setEditing({ id:r.id, email:r.email, is_activo:r.is_activo, roles:(r.roles||[]).map(x=>x.id) })}>
          Editar
        </button>
        <button
          onClick={async ()=>{
            const toActive = !r.is_activo
            const ok = await modal.confirm({
              title: toActive ? 'Activar usuario' : 'Desactivar usuario',
              message: toActive
                ? `¿Activar “${r.email}”?`
                : `¿Desactivar “${r.email}”? El usuario no podrá acceder hasta reactivarlo.`,
              tone: toActive ? 'success' : 'danger',
              okText: toActive ? 'Activar' : 'Desactivar',
              cancelText: 'Cancelar'
            })
            if (!ok) return
            try {
              await A.adminPatchUserActive(r.id, toActive)
              toast?.success('Estado actualizado'); load()
            } catch(e) { toast?.error(e?.fh?.message || 'Error') }
          }}
        >
          {r.is_activo ? 'Desactivar' : 'Activar'}
        </button>
      </div>
    )}
  ]), [modal])

  const applyEdit = async (val, { soft } = {}) => {
    if (soft) { setEditing(val); return }
    try {
      await A.adminPatchUserRoles(val.id, val.roles)
      if (val.is_activo !== rows.find(x=>x.id===val.id)?.is_activo) {
        await A.adminPatchUserActive(val.id, val.is_activo)
      }
      toast?.success('Usuario actualizado'); setEditing(null); load()
    } catch (e) { toast?.error(e?.fh?.message || 'No se pudo actualizar') }
  }

  return (
    <section className="users-page">
      <div className="toolbar">
        <SearchBar
          value={q}
          onChange={(e)=>setQ(e.target.value)}
          onSearch={load}
          onClear={()=>{ setQ(''); load() }}
          placeholder="Buscar email…"
        />
        <button className="primary" onClick={()=>setOpenNew(true)} title="Nuevo usuario">+ Nuevo</button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="tableWrap">
        {loading ? <div className="loading">Cargando…</div> :
          <Table columns={columns} rows={rows} keyField="id" empty="Sin usuarios" />
        }
      </div>

      <UserCreateModal open={openNew} onClose={()=>setOpenNew(false)} onCreated={load} rolesCatalog={roles} />
      <UserEditModal open={!!editing} onClose={()=>setEditing(null)} onSave={applyEdit} rolesCatalog={roles} value={editing || { email:'', roles:[], is_activo:true }} />
    </section>
  )
}
