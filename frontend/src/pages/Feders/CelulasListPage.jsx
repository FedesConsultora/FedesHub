import React, { useEffect } from 'react'
import { useLoading } from '../../context/LoadingContext.jsx'
import useFedersOverview from '../../hooks/useFedersOverview'
import CelulasGrid from '../../sections/feders/CelulasGrid'
import './CelulasListPage.scss'

export default function CelulasListPage() {
    const { data, loading, error, refresh } = useFedersOverview()
    const { showLoader, hideLoader } = useLoading()

    useEffect(() => {
        if (loading) showLoader()
        else hideLoader()
        return () => { if (loading) hideLoader() }
    }, [loading, showLoader, hideLoader])

    return (
        <div className="CelulasListPage">
            <header className="pageHead">
                <h1>Células Operativas</h1>
                <p className="muted">Gestión de equipos y células de trabajo.</p>
            </header>

            {loading && !data && null}
            {error && <div className="error">Error: {error}</div>}

            {!loading && !error && (
                <CelulasGrid items={data.celulas} onRefresh={refresh} />
            )}
        </div>
    )
}
