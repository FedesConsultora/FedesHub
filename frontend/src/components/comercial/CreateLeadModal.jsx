// frontend/src/components/comercial/CreateLeadModal.jsx
import React, { useState, useEffect } from 'react'
import { comercialApi } from '../../api/comercial.js'
import { federsApi } from '../../api/feders.js'
import { useToast } from '../toast/ToastProvider'
import PremiumSelect from '../ui/PremiumSelect'
import { FiX, FiCheck, FiBriefcase, FiUser, FiMail, FiPhone, FiTag, FiUsers } from 'react-icons/fi'
import './CreateLeadModal.scss'

export default function CreateLeadModal({ onClose, onCreated }) {
    const toast = useToast()
    const [catalog, setCatalog] = useState({ etapas: [], fuentes: [], statuses: [], feders: [] })
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        nombre: '',
        apellido: '',
        empresa: '',
        email: '',
        telefono: '',
        fuente_id: '',
        responsable_feder_id: ''
    })

    useEffect(() => {
        Promise.all([
            comercialApi.getCatalogs(),
            federsApi.list({ is_activo: true })
        ]).then(([catRes, fedRes]) => {
            const filteredFeders = (fedRes.rows || []).filter(f =>
                f.roles?.includes('NivelB') || f.roles?.includes('Comercial')
            )
            setCatalog({ ...catRes.data, feders: filteredFeders })
        })
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.empresa || !form.nombre || !form.responsable_feder_id) return
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
                        <label htmlFor="lead-empresa">Empresa</label>
                        <input
                            id="lead-empresa"
                            name="empresa"
                            value={form.empresa}
                            onChange={e => setForm({ ...form, empresa: e.target.value })}
                            placeholder="Nombre de la empresa"
                            required
                        />
                    </div>

                    <div className="form-grid">
                        <div className="field">
                            <FiUser className="ico" />
                            <label htmlFor="lead-nombre">Nombre</label>
                            <input
                                id="lead-nombre"
                                name="nombre"
                                value={form.nombre}
                                onChange={e => setForm({ ...form, nombre: e.target.value })}
                                placeholder="Nombre de contacto"
                                required
                            />
                        </div>
                        <div className="field">
                            <FiUser className="ico" />
                            <label htmlFor="lead-apellido">Apellido</label>
                            <input
                                id="lead-apellido"
                                name="apellido"
                                value={form.apellido}
                                onChange={e => setForm({ ...form, apellido: e.target.value })}
                                placeholder="Apellido"
                            />
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="field">
                            <FiMail className="ico" />
                            <label htmlFor="lead-email">Email</label>
                            <input
                                id="lead-email"
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                placeholder="email@ejemplo.com"
                            />
                        </div>
                        <div className="field">
                            <FiPhone className="ico" />
                            <label htmlFor="lead-telefono">Teléfono</label>
                            <input
                                id="lead-telefono"
                                name="telefono"
                                value={form.telefono}
                                onChange={e => setForm({ ...form, telefono: e.target.value })}
                                placeholder="+54..."
                            />
                        </div>
                    </div>

                    <div className="field full no-ico">
                        <PremiumSelect
                            label="Fuente"
                            icon={FiTag}
                            options={catalog.fuentes.map(f => ({ value: f.id, label: f.nombre }))}
                            value={form.fuente_id}
                            onChange={val => setForm({ ...form, fuente_id: val })}
                            placeholder="Seleccionar fuente..."
                        />
                    </div>

                    <div className="field full no-ico">
                        <PremiumSelect
                            label="Responsable"
                            icon={FiUsers}
                            options={catalog.feders.map(f => ({ value: f.id, label: `${f.nombre} ${f.apellido}` }))}
                            value={form.responsable_feder_id}
                            onChange={val => setForm({ ...form, responsable_feder_id: val })}
                            placeholder="Seleccionar responsable..."
                        />
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
