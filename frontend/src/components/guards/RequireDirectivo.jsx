import React from 'react'
import { useAuthCtx } from '../../context/AuthContext'

export default function RequireDirectivo({ children }) {
    const { roles, hasPerm, booted } = useAuthCtx()

    if (!booted) return null

    const isDirectivo =
        roles?.includes('NivelB') ||
        roles?.includes('NivelA') ||
        roles?.includes('Directivo') ||
        hasPerm('auth', 'assign')

    if (!isDirectivo) {
        return (
            <div style={{
                padding: '40px',
                textAlign: 'center',
                color: 'var(--fh-txt-secondary)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px'
            }}>
                <h2 style={{ color: 'var(--fh-txt-main)' }}>Acceso Restringido</h2>
                <p>Esta sección está disponible únicamente para usuarios con Rol A, Rol B o Directivos.</p>
            </div>
        )
    }

    return children
}
