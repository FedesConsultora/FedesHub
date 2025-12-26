import React from 'react'
import useFedersOverview from '../../hooks/useFedersOverview'
import CelulasGrid from '../../sections/feders/CelulasGrid'
import './CelulasListPage.scss'

export default function CelulasListPage() {
    const { data, loading, error, refresh } = useFedersOverview()

    return (
        <div className="CelulasListPage">
            <header className="pageHead">
                <h1>Células Operativas</h1>
                <p className="muted">Gestión de equipos y células de trabajo.</p>
            </header>

            {loading && <div className="loading">Cargando células…</div>}
            {error && <div className="error">Error: {error}</div>}

            {!loading && !error && (
                <CelulasGrid items={data.celulas} onRefresh={refresh} />
            )}
        </div>
    )
}
