// frontend/src/pages/Comercial/LeadsPage.jsx
import React, { useState } from 'react'
import { useLeads, PageSize } from './hooks/useLeads'
import LeadsFilters from '../../components/comercial/LeadsFilters'
import LeadsTable from '../../components/comercial/LeadsTable'
import LeadsKanban from '../../components/comercial/LeadsKanban'
import Pagination from '../../components/common/Pagination'
import useViewPref from '../../hooks/useViewPref'
import { comercialApi } from '../../api/comercial.js'
import CreateLeadModal from '../../components/comercial/CreateLeadModal'
import ImportLeadsModal from './ImportLeadsModal'
import './LeadsPage.scss'

export default function LeadsPage() {
    const { catalog, rows, total, loading, error, filters, setFilter, setPage, refetch } = useLeads()
    const [view, setView] = useViewPref('comercial.leads.view', 'kanban')
    const [showImport, setShowImport] = useState(false)
    const [showCreate, setShowCreate] = useState(false)

    return (
        <div className="LeadsPage">
            <header className="toolbar card">
                <div className="left">
                    <h1>Comercial - Leads</h1>
                    <div className="counter">{total} resultados</div>
                </div>

                <div className="right">
                    <div className="segmented" role="tablist" aria-label="Vista">
                        <button
                            type="button"
                            className={view === 'kanban' ? 'active' : ''}
                            onClick={() => setView('kanban')}
                            title="Pipeline"
                        >
                            <i className="fi fi-rr-apps"></i>
                            <span>Pipeline</span>
                        </button>
                        <button
                            type="button"
                            className={view === 'list' ? 'active' : ''}
                            onClick={() => setView('list')}
                            title="Lista"
                        >
                            <i className="fi fi-rr-list-check"></i>
                            <span>Lista</span>
                        </button>
                    </div>

                    <button className="btn-secondary" onClick={() => setShowImport(true)}>
                        <i className="fi fi-rr-file-import" style={{ marginRight: '8px' }}></i>
                        Importar Excel
                    </button>

                    <button className="btn-primary" onClick={() => setShowCreate(true)}>
                        + Nuevo Lead
                    </button>
                </div>
            </header>

            <div className="filters-section card">
                <LeadsFilters value={filters} catalog={catalog} onChange={setFilter} />
            </div>

            {error && <div className="error card" style={{ color: '#ffb4b4', background: '#3a1f1f', border: '1px solid #5a2d2d', padding: '12px' }}>{error.message}</div>}

            <main className="leads-content">
                {view === 'kanban' ? (
                    <LeadsKanban rows={rows} stages={catalog.etapas} loading={loading} />
                ) : (
                    <>
                        <LeadsTable rows={rows} loading={loading} />
                        <Pagination page={filters.page} pageSize={PageSize} total={total} onPage={setPage} />
                    </>
                )}
            </main>

            {showImport && (
                <ImportLeadsModal
                    onClose={() => setShowImport(false)}
                    onImported={() => { setShowImport(false); refetch(); }}
                />
            )}

            {showCreate && (
                <CreateLeadModal
                    onClose={() => setShowCreate(false)}
                    onCreated={() => { setShowCreate(false); refetch(); }}
                />
            )}
        </div>
    )
}
