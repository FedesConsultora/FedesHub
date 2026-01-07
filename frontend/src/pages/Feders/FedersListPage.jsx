import React, { useEffect } from 'react'
import { useLoading } from '../../context/LoadingContext.jsx'
import useFeders from '../../hooks/useFeders'
import PersonTag from '../../components/PersonTag.jsx'
import { FiSearch, FiFilter, FiRefreshCw, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import './FedersListPage.scss'

export default function FedersListPage() {
  document.title = 'FedesHub — Feders (Listado)'
  const { rows, total, loading, error, params, setParams, page, pages, setPage, refetch } = useFeders()
  const { showLoader, hideLoader } = useLoading()

  useEffect(() => {
    if (loading) showLoader()
    else hideLoader()

    return () => {
      if (loading) hideLoader()
    }
  }, [loading, showLoader, hideLoader])

  return (
    <section className="fhFedersList">
      <header className="listFilters">
        <div className="searchWrapper">
          <FiSearch className="searchIcon" />
          <input
            type="search"
            value={params.q}
            onChange={(e) => setParams({ q: e.target.value })}
            placeholder="Buscar por nombre o apellido"
            autoComplete="off"
          />
        </div>

        <div className="filterGroup">
          <div className="selectWrapper">
            <FiFilter className="filterIcon" />
            <select value={params.is_activo} onChange={(e) => setParams({ is_activo: e.target.value })}>
              <option value="">Todos los estados</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>

          <button className="refreshBtn" onClick={() => refetch()} disabled={loading}>
            <FiRefreshCw className={loading ? 'spinning' : ''} />
            <span>Refrescar</span>
          </button>
        </div>
      </header>

      {error && <div className="error">Error cargando listado.</div>}

      {!loading && !error && (
        <>
          <div className="counter">{total} resultados</div>
          <ul className="cards">
            {rows.map(r => {
              const p = {
                id: r.id,
                nombre: r.nombre,
                apellido: r.apellido,
                avatar_url: r.avatar_url,
                roles: r.roles || []
              }
              const subtitle = `${r.cargo_nombre || r.cargo_principal || 'Sin cargo'}`
              return (
                <li key={r.id} className="card">
                  <div className="row">
                    <PersonTag p={p} subtitle={subtitle} />
                  </div>
                </li>
              )
            })}
          </ul>

          <footer className="pager">
            <button className="pageBtn" onClick={() => setPage(page - 1)} disabled={page <= 1}>
              <FiChevronLeft /> <span>Anterior</span>
            </button>
            <div className="pageInfo">
              Página <strong>{page}</strong> de <strong>{pages}</strong>
            </div>
            <button className="pageBtn" onClick={() => setPage(page + 1)} disabled={page >= pages}>
              <span>Siguiente</span> <FiChevronRight />
            </button>
          </footer>
        </>
      )}
    </section>
  )
}