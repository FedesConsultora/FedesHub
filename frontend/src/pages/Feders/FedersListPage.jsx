import useFeders from '../../hooks/useFeders'
import PersonTag from '../../components/PersonTag.jsx'
import './FedersListPage.scss'

export default function FedersListPage(){
  document.title = 'FedesHub — Feders (Listado)'
  const { rows, total, loading, error, params, setParams, page, pages, setPage, refetch } = useFeders()

  return (
    <section className="fhFedersList">
      <header className="listFilters">
        <input
          value={params.q}
          onChange={(e)=>setParams({ q:e.target.value })}
          placeholder="Buscar por nombre, apellido, teléfono o email…"
        />
        <select value={params.is_activo} onChange={(e)=>setParams({ is_activo: e.target.value })}>
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
        <button onClick={()=>refetch()} disabled={loading}>Refrescar</button>
      </header>

      {error && <div className="error">Error cargando listado.</div>}
      {loading && <div className="loading">Cargando…</div>}

      {!loading && !error && (
        <>
          <div className="counter">{total} resultados</div>
          <ul className="cards">
            {rows.map(r => {
              const p = {
                nombre: r.nombre,
                apellido: r.apellido,
                avatar_url: r.avatar_url,
                roles: r.roles || [] // del repo
              }
              const subtitle = `${r.cargo_nombre || r.cargo_principal || 'Sin cargo'}${r.celula_nombre ? ` · ${r.celula_nombre}` : ''}`
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
            <button onClick={()=>setPage(page-1)} disabled={page<=1}>Anterior</button>
            <span>Página {page} / {pages}</span>
            <button onClick={()=>setPage(page+1)} disabled={page>=pages}>Siguiente</button>
          </footer>
        </>
      )}
    </section>
  )
}