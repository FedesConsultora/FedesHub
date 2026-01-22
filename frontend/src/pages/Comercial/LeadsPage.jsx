// /frontend/src/pages/Comercial/LeadsPage.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { comercialApi } from '../../api/comercial.js'
import { federsApi } from '../../api/feders.js'
import { useToast } from '../../components/toast/ToastProvider'
import LeadDetail from '../../components/comercial/LeadDetail'
import ComercialDashboards from '../../components/comercial/ComercialDashboards'
import LeadsTrash from '../../components/comercial/LeadsTrash'
import LeadsTable from '../../components/comercial/LeadsTable'
import LeadsKanban from '../../components/comercial/LeadsKanban'
import CreateLeadModal from '../../components/comercial/CreateLeadModal'
import LeadsFilters from '../../components/comercial/LeadsFilters'
import ImportLeadsModal from './ImportLeadsModal'
import ModalPanel from '../Tareas/components/ModalPanel.jsx'
import { FiPlus, FiGrid, FiList, FiDownload, FiSearch, FiChevronLeft, FiChevronRight, FiTrash2 } from 'react-icons/fi'
import './LeadsPage.scss'

const PAGE_SIZE = 50

export default function LeadsPage() {
    const [searchParams, setSearchParams] = useSearchParams()
    const toast = useToast()

    const view = searchParams.get('view') === 'kanban' ? 'kanban' : 'table'
    const [leads, setLeads] = useState([])
    const [catalog, setCatalog] = useState({ statuses: [], etapas: [], fuentes: [], motivosPerdida: [], feders: [] })
    const [stats, setStats] = useState({ total: 0 })
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [showCreate, setShowCreate] = useState(false)
    const [showImport, setShowImport] = useState(false)
    const [showTrash, setShowTrash] = useState(false)
    const [openLeadId, setOpenLeadId] = useState(null)
    const [isDashExpanded, setIsDashExpanded] = useState(window.innerWidth > 768)

    const [page, setPage] = useState(0)
    const [refreshKey, setRefreshKey] = useState(0)
    const [filters, setFilters] = useState({
        q: '',
        status_id: '',
        etapa_id: '',
        responsable_feder_id: ''
    })

    const fetchLeads = useCallback(async (isLoadMore = false) => {
        try {
            if (isLoadMore) setLoadingMore(true)
            else {
                setLoading(true)
                setRefreshKey(prev => prev + 1)
            }

            const currentPage = isLoadMore ? page + 1 : 0

            const [leadsRes, catRes, federsRes] = await Promise.all([
                comercialApi.listLeads({
                    ...filters,
                    limit: PAGE_SIZE,
                    offset: currentPage * PAGE_SIZE
                }),
                isLoadMore ? Promise.resolve(null) : comercialApi.getCatalogs(),
                isLoadMore ? Promise.resolve(null) : federsApi.list({ is_activo: true })
            ])

            if (isLoadMore) {
                setLeads(prev => [...prev, ...leadsRes.data.rows])
                setPage(currentPage)
            } else {
                setLeads(leadsRes.data.rows)
                setPage(0)
                if (catRes) {
                    setCatalog({
                        ...catRes.data,
                        feders: federsRes?.rows || []
                    })
                }
            }

            setStats({ total: leadsRes.data.count })
        } catch (err) {
            toast.error('Error al cargar leads')
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }, [filters, page, toast])

    // Fetch on filter change
    useEffect(() => {
        fetchLeads(false)
    }, [filters])

    const handlePageChange = (newPage) => {
        setPage(newPage)
        setLoading(true)
        comercialApi.listLeads({
            ...filters,
            limit: PAGE_SIZE,
            offset: newPage * PAGE_SIZE
        }).then(res => {
            setLeads(res.data.rows)
            setStats({ total: res.data.count })
            setLoading(false)
        }).catch(() => {
            toast.error('Error al cambiar de página')
            setLoading(false)
        })
    }

    const setView = (v) => {
        searchParams.set('view', v)
        setSearchParams(searchParams)
    }

    const hasLeads = leads.length > 0;
    const hasMore = leads.length < stats.total;
    const totalPages = Math.ceil(stats.total / PAGE_SIZE)

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
                        >
                            <FiGrid />
                            <span>Kanban</span>
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={view === 'table'}
                            className={view === 'table' ? 'active' : ''}
                            onClick={() => setView('table')}
                        >
                            <FiList />
                            <span>Lista</span>
                        </button>
                    </div>

                    <button className="btn-secondary" onClick={() => setShowImport(true)}>
                        <FiDownload /> Importar
                    </button>
                    <button className="btn-secondary" onClick={() => setShowTrash(true)}>
                        <FiTrash2 /> Papelera
                    </button>
                    <button className="submit" onClick={() => setShowCreate(true)}>
                        <FiPlus /> Nuevo Lead
                    </button>
                </div>
            </header>

            <main className="leads-content">
                <ComercialDashboards
                    filters={filters}
                    isExpanded={isDashExpanded}
                    onToggle={() => setIsDashExpanded(!isDashExpanded)}
                    refreshKey={refreshKey}
                />

                {!loading && !hasLeads ? (
                    <div className="fh-empty-state card">
                        <div className="ico-wrap"><FiSearch /></div>
                        <h3>No encontramos ningún lead</h3>
                        <p>Ajustá los filtros o cargá uno nuevo para empezar.</p>
                        <button className="btn-primary" onClick={() => setShowCreate(true)}>
                            <FiPlus /> Crear primer lead
                        </button>
                    </div>
                ) : (
                    <div className="content-scroll">
                        {view === 'kanban' ? (
                            <div className="kanban-wrapper">
                                <LeadsKanban
                                    leads={leads}
                                    stages={catalog.etapas}
                                    onCardClick={id => setOpenLeadId(id)}
                                    onUpdated={() => fetchLeads(false)}
                                    loading={loading && !loadingMore}
                                />
                                {hasMore && (
                                    <div className="load-more-kanban">
                                        <button
                                            className="btn-ver-mas"
                                            onClick={() => fetchLeads(true)}
                                            disabled={loadingMore}
                                        >
                                            {loadingMore ? 'Cargando...' : 'Ver más leads'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="table-wrapper">
                                <div className="table-card card">
                                    <LeadsTable leads={leads} loading={loading} onRowClick={id => setOpenLeadId(id)} />
                                </div>

                                {totalPages > 1 && (
                                    <div className="pagination">
                                        <button
                                            disabled={page === 0}
                                            onClick={() => handlePageChange(page - 1)}
                                        >
                                            <FiChevronLeft />
                                        </button>
                                        <span>Página {page + 1} de {totalPages}</span>
                                        <button
                                            disabled={page >= totalPages - 1}
                                            onClick={() => handlePageChange(page + 1)}
                                        >
                                            <FiChevronRight />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {showCreate && <CreateLeadModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchLeads(false); }} />}
            {showImport && <ImportLeadsModal onClose={() => setShowImport(false)} onImported={() => { setShowImport(false); fetchLeads(false); }} />}

            <ModalPanel open={showTrash} onClose={() => setShowTrash(false)}>
                <LeadsTrash onRestore={() => { fetchLeads(false); setShowTrash(false); }} />
            </ModalPanel>

            <ModalPanel open={!!openLeadId} onClose={() => setOpenLeadId(null)}>
                {openLeadId && (
                    <LeadDetail
                        leadId={openLeadId}
                        onClose={() => setOpenLeadId(null)}
                        onUpdated={() => fetchLeads(false)}
                    />
                )}
            </ModalPanel>
        </div>
    )
}
