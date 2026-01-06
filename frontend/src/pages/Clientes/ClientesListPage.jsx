// frontend/src/pages/Clientes/ClientesListPage.jsx
import React, { useMemo, useState } from 'react'
import { useClientesList, PageSize } from './hooks/useClientesList'
import ClientesFilters from '../../components/clients/ClientesFilters'
import ClientesTable from '../../components/clients/ClientesTable'
import ClientesCards from '../../components/clients/ClientesCards'
import Pagination from '../../components/common/Pagination'
import useViewPref from '../../hooks/useViewPref'
import CreateClienteModal from '../../components/clients/CreateClienteModal'
import { useAuth } from '../../context/AuthContext.jsx'
import { api } from '../../api/client.js'
import './ClientesListPage.scss'

import { useLoading } from '../../context/LoadingContext.jsx'

export default function ClientesListPage() {
  const { catalog, rows, total, loading, error, filters, setFilter, setPage, refetch } = useClientesList()
  const { roles } = useAuth()
  const { showLoader, hideLoader } = useLoading()
  const isAdmin = roles.includes('NivelA')
  const [view, setView] = useViewPref('clientes.view', 'cards')
  const [showCreate, setShowCreate] = useState(false)
  const [importing, setImporting] = useState(false)

  React.useEffect(() => {
    if (loading) showLoader()
    else hideLoader()

    return () => {
      if (loading) hideLoader()
    }
  }, [loading, showLoader, hideLoader])

  const handleExport = async () => {
    try {
      const resp = await api.get('/clientes/export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([resp.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'clientes.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (e) {
      alert('Error al exportar: ' + (e.fh?.message || e.message))
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fd = new FormData()
    fd.append('file', file)

    setImporting(true)
    try {
      const { data } = await api.post('/clientes/import', fd)
      alert(`Importación finalizada.\nCreados: ${data.created}\nActualizados: ${data.updated}\nErrores: ${data.errors.length}`)
      refetch()
    } catch (e) {
      alert('Error al importar: ' + (e.fh?.message || e.message))
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

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

          {isAdmin && (
            <>
              <button
                className="btnGhost"
                style={{ padding: '8px 12px' }}
                onClick={handleExport}
                disabled={loading}
              >
                Exportar
              </button>
              <button
                className="btnGhost"
                style={{ padding: '8px 12px' }}
                onClick={() => document.getElementById('import-excel')?.click()}
                disabled={importing}
              >
                {importing ? 'Importando...' : 'Importar'}
              </button>
              <input
                id="import-excel"
                type="file"
                accept=".xlsx, .xls"
                style={{ display: 'none' }}
                onChange={handleImport}
              />
            </>
          )}

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


      {showCreate && (
        <CreateClienteModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); refetch() }}
        />
      )}
    </div>
  )
}