import React, { useEffect } from 'react'
import { useLoading } from '../../context/LoadingContext.jsx'
import useCargosOverview from '../../hooks/useCargosOverview'
import CargosGrid from '../../sections/feders/CargosGrid.jsx'
import './CargosList.scss'

export default function CargosList() {
  document.title = 'FedesHub — Cargos'
  const { data, loading, error } = useCargosOverview()
  const { showLoader, hideLoader } = useLoading()

  useEffect(() => {
    if (loading) showLoader()
    else hideLoader()
    return () => { if (loading) hideLoader() }
  }, [loading, showLoader, hideLoader])

  return (
    <section className="fhCargosPage">
      <header className="pageHeader">
        <div className="title">
          <h2>Cargos y Roles</h2>
          <p>Mapa organizacional de posiciones y sus titulares actuales.</p>
        </div>
      </header>

      {error && <div className="error">Error cargando cargos.</div>}
      {loading && !data && null}

      {!loading && !error && (
        <CargosGrid items={data} />
      )}
    </section>
  )
}
