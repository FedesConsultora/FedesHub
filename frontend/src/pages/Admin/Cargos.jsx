import { useEffect, useMemo, useState } from 'react'
import * as C from '../../api/cargos'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import FormRow from '../../components/ui/FormRow'
import './Admin.scss'
import './cargos.page.scss'                     // ⬅️ estilos de la página
import { useToast } from '../../components/toast/ToastProvider.jsx'
import { useModal } from '../../components/modal/ModalProvider.jsx' // ⬅️ provider nuevo

import { useLoading } from '../../context/LoadingContext.jsx'

export default function AdminCargos() {
  document.title = 'FedesHub — Cargos'
  const toast = useToast()
  const modal = useModal()
  const { showLoader, hideLoader } = useLoading()

  const [rows, setRows] = useState([])
  const [ambitos, setAmbitos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (loading) showLoader()
    else hideLoader()
    return () => { if (loading) hideLoader() }
  }, [loading, showLoader, hideLoader])
  const [error, setError] = useState(null)

  const [q, setQ] = useState('')
  const [ambitoId, setAmbitoId] = useState('')
  const [estado, setEstado] = useState('all') // all | true | false

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ id: null, nombre: '', descripcion: '', ambito_id: '', is_activo: true })

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const [{ data: amb }, { data: list }] = await Promise.all([
        C.listAmbitos(), C.listCargos({
          q: q?.trim() || undefined,
          ambito_id: ambitoId || undefined,
          is_activo: estado === 'all' ? undefined : (estado === 'true')
        })
      ])
      setAmbitos(amb || [])
      setRows((list?.rows) || [])
    } catch (e) {
      setError(e?.fh?.message || 'Error cargando cargos')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, []) // primer render

  const columns = useMemo(() => ([
    { key: 'nombre', header: 'Nombre' },
    { key: 'ambito_nombre', header: 'Ámbito' },
    { key: 'is_activo', header: 'Activo', render: r => r.is_activo ? 'Sí' : 'No' },
    { key: 'descripcion', header: 'Descripción', className: 'col-grow' },
    {
      key: 'actions', header: '', render: r => (
        <div className="row-actions">
          <button onClick={async () => {
            try {
              const { data } = await C.getCargo(r.id)
              setForm({
                id: data.id,
                nombre: data.nombre || '',
                descripcion: data.descripcion || '',
                ambito_id: data.ambito_id,
                is_activo: !!data.is_activo
              })
              setOpen(true)
            } catch (e) { toast?.error(e?.fh?.message || 'No se pudo abrir') }
          }}>Editar</button>

          <button onClick={async () => {
            try {
              await C.setCargoActive(r.id, !r.is_activo)
              toast?.success('Estado actualizado')
              load()
            } catch (e) { toast?.error(e?.fh?.message || 'Error al cambiar estado') }
          }}>{r.is_activo ? 'Desactivar' : 'Activar'}</button>

          <button onClick={async () => {
            const ok = await modal.confirm({
              title: 'Eliminar cargo',
              message: `¿Eliminar “${r.nombre}”? Esta acción no se puede deshacer.`,
              tone: 'danger',
              okText: 'Eliminar',
              cancelText: 'Cancelar'
            })
            if (!ok) return
            try { await C.deleteCargo(r.id); toast?.success('Cargo eliminado'); load() }
            catch (e) { toast?.error(e?.fh?.message || 'No se pudo eliminar') }
          }}>Eliminar</button>
        </div>
      )
    }
  ]), [modal, toast])

  const openNew = () => { setForm({ id: null, nombre: '', descripcion: '', ambito_id: '', is_activo: true }); setOpen(true) }

  const save = async () => {
    if (!form.nombre?.trim()) { toast?.warn('Nombre requerido'); return }
    if (!form.ambito_id) { toast?.warn('Seleccioná un Ámbito'); return }
    try {
      if (form.id) await C.updateCargo(form.id, {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion || null,
        ambito_id: Number(form.ambito_id),
        is_activo: !!form.is_activo
      })
      else await C.createCargo({
        nombre: form.nombre.trim(),
        descripcion: form.descripcion || null,
        ambito_id: Number(form.ambito_id),
        is_activo: !!form.is_activo
      })
      toast?.success('Guardado')
      setOpen(false); load()
    } catch (e) { toast?.error(e?.fh?.message || 'No se pudo guardar') }
  }

  return (
    <section className="cargos-page">
      <div className="toolbar">
        <input placeholder="Buscar…" value={q} onChange={e => setQ(e.target.value)} />
        <select value={ambitoId} onChange={e => setAmbitoId(e.target.value)}>
          <option value="">Todos los ámbitos</option>
          {(ambitos || []).map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
        <select value={estado} onChange={e => setEstado(e.target.value)}>
          <option value="all">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
        <button onClick={load}>Filtrar</button>
        <button className="primary" onClick={openNew}>+ Nuevo cargo</button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="tableWrap">
        <Table columns={columns} rows={rows} keyField="id" empty="Sin cargos" />
      </div>

      <Modal
        open={open}
        title={form.id ? 'Editar cargo' : 'Nuevo cargo'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button onClick={() => setOpen(false)}>Cancelar</button>
            <button className="primary" onClick={save}>Guardar</button>
          </>
        }
      >
        {/* Wrapper para estilos del modal de Cargos */}
        <div className="cargos-modal">
          <FormRow label="Nombre"><input value={form.nombre} onChange={e => setForm(v => ({ ...v, nombre: e.target.value }))} /></FormRow>
          <FormRow label="Ámbito">
            <select value={form.ambito_id} onChange={e => setForm(v => ({ ...v, ambito_id: e.target.value }))}>
              <option value="">Seleccionar…</option>
              {(ambitos || []).map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </FormRow>
          <FormRow label="Descripción"><input value={form.descripcion || ''} onChange={e => setForm(v => ({ ...v, descripcion: e.target.value }))} /></FormRow>
          <FormRow label="Activo">
            <select value={String(!!form.is_activo)} onChange={e => setForm(v => ({ ...v, is_activo: e.target.value === 'true' }))}>
              <option value="true">Sí</option><option value="false">No</option>
            </select>
          </FormRow>
        </div>
      </Modal>
    </section>
  )
}
