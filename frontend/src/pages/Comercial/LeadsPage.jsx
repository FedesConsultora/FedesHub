// /frontend/src/pages/Comercial/LeadsPage.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { comercialApi } from '../../api/comercial.js'
import { useToast } from '../../components/toast/ToastProvider'
import { FiPlus, FiGrid, FiList, FiDownload, FiSearch } from 'react-icons/fi'
import LeadsTable from '../../components/comercial/LeadsTable'
import LeadsKanban from '../../components/comercial/LeadsKanban'
import CreateLeadModal from '../../components/comercial/CreateLeadModal'
import LeadsFilters from '../../components/comercial/LeadsFilters'
import ImportLeadsModal from './ImportLeadsModal'
import ModalPanel from '../Tareas/components/ModalPanel.jsx'
import LeadDetail from '../../components/comercial/LeadDetail'
import './LeadsPage.scss'

export default function LeadsPage() {
    const [searchParams, setSearchParams] = useSearchParams()
    const toast = useToast()

    const view = searchParams.get('view') === 'kanban' ? 'kanban' : 'table'
    const [leads, setLeads] = useState([])
    const [catalog, setCatalog] = useState({ statuses: [], etapas: [], fuentes: [], motivosPerdida: [] })
    const [stats, setStats] = useState({ total: 0 })
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [showImport, setShowImport] = useState(false)
    const [openLeadId, setOpenLeadId] = useState(null)

    const [filters, setFilters] = useState({
        q: '',
        status_id: '',
        etapa_id: '',
        responsable_feder_id: ''
    })

    const fetchLeads = useCallback(async () => {
        try {
            setLoading(true)
            const [leadsRes, catRes] = await Promise.all([
                comercialApi.listLeads(filters),
                comercialApi.getCatalogs()
            ])
            setLeads(leadsRes.data.rows)
            setStats({ total: leadsRes.data.count })
            setCatalog(catRes.data)
        } catch (err) {
            toast.error('Error al cargar leads')
        } finally {
            setLoading(false)
        }
    }, [filters, toast])

    useEffect(() => { fetchLeads() }, [fetchLeads])

    const setView = (v) => {
        searchParams.set('view', v)
        setSearchParams(searchParams)
    }

    const hasLeads = leads.length > 0;

    return (
        <div className="LeadsPage page-container">
            <header className="toolbar card">
                <div className="left">
                    <h1>Leads</h1>
                    <div className="counter">{stats.total} leads</div>
                </div>

                <div className="center">
                    <LeadsFilters
                        value={filters}
                        catalog={catalog}
                        onChange={v => setFilters(v)}
                    />
                </div>

                <div className="right">
                    <div className="segmented" role="tablist" aria-label="Vista">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={view === 'kanban'}
                            className={view === 'kanban' ? 'active' : ''}
                            onClick={() => setView('kanban')}
                            title="Ver en Kanban"
                        >
                            <FiGrid style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                            <span>Kanban</span>
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={view === 'table'}
                            className={view === 'table' ? 'active' : ''}
                            onClick={() => setView('table')}
                            title="Ver como lista"
                        >
                            <FiList style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                            <span>Lista</span>
                        </button>
                    </div>

                    <button className="btn-secondary" onClick={() => setShowImport(true)} style={{ padding: '8px 14px' }}>
                        <FiDownload /> Importar
                    </button>
                    <button className="submit" onClick={() => setShowCreate(true)}>
                        <FiPlus /> Nuevo Lead
                    </button>
                </div>
            </header>

            <main className="leads-content">
                {!loading && !hasLeads ? (
                    <div className="fh-empty-state card">
                        <div className="ico-wrap"><FiSearch /></div>
                        <h3>No encontramos ningún lead</h3>
                        <p>Ajustá los filtros o cargá uno nuevo para empezar.</p>
                        <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowCreate(true)}>
                            <FiPlus /> Crear primer lead
                        </button>
                    </div>
                ) : (
                    view === 'kanban' ? (
                        <LeadsKanban leads={leads} stages={catalog.etapas} onCardClick={id => setOpenLeadId(id)} onUpdated={fetchLeads} />
                    ) : (
                        <div className="table-card card">
                            <LeadsTable leads={leads} loading={loading} onRowClick={id => setOpenLeadId(id)} />
                        </div>
                    )
                )}
            </main>

            {showCreate && <CreateLeadModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchLeads(); }} />}
            {showImport && <ImportLeadsModal onClose={() => setShowImport(false)} onImported={() => { setShowImport(false); fetchLeads(); }} />}

            <ModalPanel open={!!openLeadId} onClose={() => setOpenLeadId(null)}>
                {openLeadId && (
                    <LeadDetail
                        leadId={openLeadId}
                        onClose={() => setOpenLeadId(null)}
                        onUpdated={fetchLeads}
                    />
                )}
            </ModalPanel>
        </div>
    )
}
