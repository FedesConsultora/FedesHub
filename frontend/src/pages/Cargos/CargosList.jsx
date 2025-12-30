import useCargosOverview from '../../hooks/useCargosOverview'
import CargosGrid from '../../sections/feders/CargosGrid.jsx'
import './CargosList.scss'

export default function CargosList() {
  document.title = 'FedesHub — Cargos'
  const { data, loading, error } = useCargosOverview()

  return (
    <section className="fhCargosPage">
      <header className="pageHeader">
        <div className="title">
          <h2>Cargos y Roles</h2>
          <p>Mapa organizacional de posiciones y sus titulares actuales.</p>
        </div>
      </header>

      {error && <div className="error">Error cargando cargos.</div>}
      {loading && <div className="loading">Cargando…</div>}

      {!loading && !error && (
        <CargosGrid items={data} />
      )}
    </section>
  )
}
