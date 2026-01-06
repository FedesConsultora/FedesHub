import { useEffect, useState, useRef } from 'react'
import { FiPlus, FiEdit2, FiPower } from 'react-icons/fi'
import * as C from '../../../api/cargos'
import { useToast } from '../../toast/ToastProvider'
import { useModal } from '../../modal/ModalProvider'
import GlobalLoader from '../../loader/GlobalLoader.jsx'

export default function CargosTab() {
    const toast = useToast()
    const modal = useModal()
    const formRef = useRef(null)

    const [cargos, setCargos] = useState([])
    const [ambitos, setAmbitos] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    // Form
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState({
        nombre: '',
        descripcion: '',
        ambito_id: ''
    })

    const load = async () => {
        setLoading(true)
        try {
            const params = { limit: 100 }
            if (search) params.q = search

            const [cargosRes, ambitosRes] = await Promise.all([
                C.listCargos(params),
                C.listAmbitos()
            ])
            // cargos API returns { rows: [...] } or array directly
            const cargosData = cargosRes.data
            setCargos(Array.isArray(cargosData) ? cargosData : (cargosData?.rows || []))
            setAmbitos(ambitosRes.data || [])
        } catch (e) {
            console.error('Error loading cargos:', e)
            toast?.error('Error cargando cargos')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const resetForm = () => {
        setForm({ nombre: '', descripcion: '', ambito_id: '' })
        setEditing(null)
        setShowForm(false)
    }

    const handleCreate = async () => {
        if (!form.nombre || !form.ambito_id) {
            toast?.warn('Nombre y ámbito son requeridos')
            return
        }

        try {
            await C.createCargo({
                nombre: form.nombre.trim(),
                descripcion: form.descripcion?.trim() || null,
                ambito_id: parseInt(form.ambito_id)
            })
            toast?.success('Cargo creado')
            resetForm()
            load()
        } catch (e) {
            toast?.error(e?.fh?.message || 'Error al crear cargo')
        }
    }

    const handleEdit = (cargo) => {
        setEditing(cargo)
        setForm({
            nombre: cargo.nombre,
            descripcion: cargo.descripcion || '',
            ambito_id: String(cargo.ambito_id)
        })
        setShowForm(true)
        // Scroll to form after render
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 50)
    }

    const handleUpdate = async () => {
        if (!editing || !form.nombre) return

        try {
            await C.updateCargo(editing.id, {
                nombre: form.nombre.trim(),
                descripcion: form.descripcion?.trim() || null,
                ambito_id: parseInt(form.ambito_id)
            })
            toast?.success('Cargo actualizado')
            resetForm()
            load()
        } catch (e) {
            toast?.error(e?.fh?.message || 'Error al actualizar')
        }
    }

    const toggleActive = async (cargo) => {
        const toActive = !cargo.is_activo
        const ok = await modal.confirm({
            title: toActive ? 'Activar cargo' : 'Desactivar cargo',
            message: toActive
                ? `¿Activar "${cargo.nombre}"?`
                : `¿Desactivar "${cargo.nombre}"?`,
            tone: toActive ? 'success' : 'danger',
            okText: toActive ? 'Activar' : 'Desactivar'
        })
        if (!ok) return

        try {
            await C.setCargoActive(cargo.id, toActive)
            toast?.success(toActive ? 'Cargo activado' : 'Cargo desactivado')
            load()
        } catch (e) {
            toast?.error('Error al cambiar estado')
        }
    }

    return (
        <div className="tabContent">
            <div className="toolbar">
                <input
                    className="searchInput"
                    type="text"
                    placeholder="Buscar cargo..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && load()}
                />
                <button className="btnPrimary" onClick={() => { resetForm(); setShowForm(true) }}>
                    <FiPlus /> Nuevo Cargo
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <div className="userForm" ref={formRef}>
                    <h3>{editing ? 'Editar Cargo' : 'Nuevo Cargo'}</h3>

                    <div className="formGrid">
                        <div className="formRow">
                            <label>Nombre</label>
                            <input
                                type="text"
                                placeholder="Nombre del cargo"
                                value={form.nombre}
                                onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))}
                            />
                        </div>
                        <div className="formRow">
                            <label>Ámbito</label>
                            <select
                                value={form.ambito_id}
                                onChange={(e) => setForm(f => ({ ...f, ambito_id: e.target.value }))}
                            >
                                <option value="">Seleccionar...</option>
                                {ambitos.map(a => (
                                    <option key={a.id} value={a.id}>{a.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div className="formRow" style={{ gridColumn: '1 / -1' }}>
                            <label>Descripción (opcional)</label>
                            <input
                                type="text"
                                placeholder="Descripción del cargo"
                                value={form.descripcion}
                                onChange={(e) => setForm(f => ({ ...f, descripcion: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="formActions">
                        <button type="button" className="cancel" onClick={resetForm}>
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="submit"
                            onClick={editing ? handleUpdate : handleCreate}
                        >
                            {editing ? 'Guardar' : 'Crear Cargo'}
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div style={{ position: 'relative', minHeight: 200 }}>
                    <GlobalLoader size={80} />
                </div>
            ) : cargos.length === 0 ? (
                <div className="empty">No hay cargos</div>
            ) : (
                <table className="dataTable">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Ámbito</th>
                            <th>Descripción</th>
                            <th>Estado</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {cargos.map(cargo => (
                            <tr key={cargo.id}>
                                <td><strong>{cargo.nombre}</strong></td>
                                <td>
                                    <span className="badge role">{cargo.ambito_nombre}</span>
                                </td>
                                <td style={{ color: 'var(--fh-muted)' }}>{cargo.descripcion || '—'}</td>
                                <td>
                                    <span className={`badge ${cargo.is_activo ? 'ok' : 'off'}`}>
                                        {cargo.is_activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td>
                                    <div className="actions">
                                        <button onClick={() => handleEdit(cargo)} title="Editar">
                                            <FiEdit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => toggleActive(cargo)}
                                            className={cargo.is_activo ? 'danger' : ''}
                                            title={cargo.is_activo ? 'Desactivar' : 'Activar'}
                                        >
                                            <FiPower size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )
}
