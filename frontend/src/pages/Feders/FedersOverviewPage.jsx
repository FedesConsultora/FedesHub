import React, { useEffect } from 'react'
import { useLoading } from '../../context/LoadingContext.jsx'
import useFedersOverview from '../../hooks/useFedersOverview'
import FedersHeader from '../../sections/feders/FedersHeader.jsx'
import CLevelGrid from '../../sections/feders/CLevelGrid.jsx'
import TriGlobalPanel from '../../sections/feders/TriGlobalPanel.jsx'
import CelulasGrid from '../../sections/feders/CelulasGrid.jsx'
import './FedersOverviewPage.scss'

export default function FedersOverviewPage() {
  document.title = 'FedesHub — Feders'
  const { data, loading, error, params, setParams, refresh } = useFedersOverview()
  const { showLoader, hideLoader } = useLoading()

  useEffect(() => {
    if (loading) showLoader()
    else hideLoader()
    return () => { if (loading) hideLoader() }
  }, [loading, showLoader, hideLoader])

  return (
    <section className="fhFedersOverview">
      <FedersHeader params={params} setParams={setParams} loading={loading} />
      {error && <div className="error">Error cargando overview.</div>}
      {loading && !data && null}
      {!loading && !error && (
        <>
          <CLevelGrid items={data.c_level} />
          <TriGlobalPanel areas={data.areas} />
          {data.celulas.length > 0 && (
            <CelulasGrid items={data.celulas} onRefresh={refresh} />
          )}
        </>
      )}
    </section>
  )
}
