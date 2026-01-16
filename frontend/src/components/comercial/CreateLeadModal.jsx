// frontend/src/components/comercial/CreateLeadModal.jsx
import React, { useState, useEffect } from 'react'
import { comercialApi } from '../../api/comercial.js'
import { useToast } from '../toast/ToastProvider'
import { FiX, FiCheck, FiBriefcase, FiUser, FiMail, FiPhone, FiTag } from 'react-icons/fi'
import './CreateLeadModal.scss'

export default function CreateLeadModal({ onClose, onCreated }) {
    const toast = useToast()
    const [catalog, setCatalog] = useState({ etapas: [], fuentes: [], statuses: [] })
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        nombre: '',
        apellido: '',
        empresa: '',
        email: '',
        telefono: '',
        fuente_id: '',
        responsable_feder_id: 1
    })

    useEffect(() => {
        comercialApi.getCatalogs().then(res => setCatalog(res.data))
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.empresa || !form.nombre) return
        setSaving(true)
        try {
            await comercialApi.createLead({
                ...form,
                status_id: catalog.statuses.find(s => s.codigo === 'pendiente')?.id,
                etapa_id: catalog.etapas.find(et => et.codigo === 'contacto')?.id
            })
            toast.success('Lead creado correctamente')
            onCreated()
        } catch (err) {
            toast.error('Error al crear lead')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="CreateLeadModal">
            <div className="tcCard">
                <header className="tcHeader">
                    <div className="brand">
                        <div className="logo">Nuevo Lead</div>
                    </div>
                    <button type="button" className="close" onClick={onClose}><FiX /></button>
                </header>

                <form className="tcBody" onSubmit={handleSubmit}>
                    <div className="field full">
                        <FiBriefcase className="ico" />
                        <label>Empresa</label>
                        <input value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} placeholder="Nombre de la empresa" required />
                    </div>

                    <div className="form-grid">
                        <div className="field">
                            <FiUser className="ico" />
                            <label>Nombre</label>
                            <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre de contacto" required />
                        </div>
                        <div className="field">
                            <FiUser className="ico" />
                            <label>Apellido</label>
                            <input value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} placeholder="Apellido" />
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="field">
                            <FiMail className="ico" />
                            <label>Email</label>
                            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@ejemplo.com" />
                        </div>
                        <div className="field">
                            <FiPhone className="ico" />
                            <label>Teléfono</label>
                            <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="+54..." />
                        </div>
                    </div>

                    <div className="field full">
                        <FiTag className="ico" />
                        <label>Fuente</label>
                        <select value={form.fuente_id} onChange={e => setForm({ ...form, fuente_id: e.target.value })}>
                            <option value="">Seleccionar fuente...</option>
                            {catalog.fuentes.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                        </select>
                    </div>

                    <div className="actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? 'Guardando...' : 'Crear Lead'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
