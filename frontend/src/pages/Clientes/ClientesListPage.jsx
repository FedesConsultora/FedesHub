// frontend/src/pages/Clientes/ClientesListPage.jsx
import React, { useMemo, useState } from 'react'
import { useClientesList, PageSize } from './hooks/useClientesList'
import ClientesFilters from '../../components/clients/ClientesFilters'
import ClientesTable from '../../components/clients/ClientesTable'
import ClientesCards from '../../components/clients/ClientesCards'
import Pagination from '../../components/common/Pagination'
import useViewPref from '../../hooks/useViewPref'
import CreateClienteModal from '../../components/clients/CreateClienteModal'
import './ClientesListPage.scss'

export default function ClientesListPage() {
  const { catalog, rows, total, loading, error, filters, setFilter, setPage, refetch } = useClientesList()
  const [view, setView] = useViewPref('clientes.view', 'cards') // 'cards' | 'list'
  const [showCreate, setShowCreate] = useState(false)
 console.log('---------------------------------->',rows)

  const extractNumero = (nombre = '') => {
  const match = nombre.match(/^(\d+)/)
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY
  }
  
  const orderedRows = useMemo(() => {
  if (!rows) return []

  return [...rows].sort((a, b) => {
    const na = extractNumero(a.nombre)
    const nb = extractNumero(b.nombre)
    return na - nb
  })
}, [rows])
  const countTxt = useMemo(() => {
    const showing = rows?.length ?? 0
    return total ? `${showing} de ${total} resultados` : `${showing} resultados`
  }, [rows, total])

  return (
    <div className="ClientesListPage">
      <header className="toolbar card">
        <div className="left">
          <h1>Clientes</h1>
          <div className="counter">{countTxt}</div>
        </div>

        <div className="right" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="segmented" role="tablist" aria-label="Vista">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'cards'}
              className={view === 'cards' ? 'active' : ''}
              onClick={() => setView('cards')}
              title="Ver como tarjetas"
              data-testid="clientes-toggle-cards"
            >
              Tarjetas
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'list'}
              className={view === 'list' ? 'active' : ''}
              onClick={() => setView('list')}
              title="Ver como lista"
              data-testid="clientes-toggle-list"
            >
              Lista
            </button>
          </div>

          <button
            className="submit"
            style={{ padding: '8px 12px', width: 'auto' }}
            onClick={() => setShowCreate(true)}
          >
            + Nuevo cliente
          </button>
        </div>
      </header>

      <section className="filters card">
        <ClientesFilters value={filters} catalog={catalog} onChange={setFilter} />
      </section>

      {error && <div className="error card">{error}</div>}

      <section className="results" data-view={view}>
        {view === 'cards'
          ? <ClientesCards rows={orderedRows} loading={loading} />
          : <ClientesTable rows={orderedRows} loading={loading} />
        }
      </section>

      <Pagination page={filters.page || 0} pageSize={PageSize} total={total} onPage={setPage} />
      {loading && <div className="loading">Cargando…</div>}

      {showCreate && (
        <CreateClienteModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); refetch() }}
        />
      )}
    </div>
  )
}