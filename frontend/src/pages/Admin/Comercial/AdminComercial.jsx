// frontend/src/pages/Admin/Comercial/AdminComercial.jsx
import React, { useState } from 'react'
import AdminEECC from './AdminEECC'
import AdminProductos from './AdminProductos'
import AdminDescuentos from './AdminDescuentos'
import AdminObjetivos from './AdminObjetivos'
import OnboardingManagement from '../../../components/comercial/OnboardingManagement.jsx'
import './AdminComercial.scss'

export default function AdminComercial() {
    const [subTab, setSubTab] = useState('eecc')

    return (
        <div className="AdminComercial">
            <div className="sub-tabs">
                <button
                    className={subTab === 'onboarding' ? 'active' : ''}
                    onClick={() => setSubTab('onboarding')}
                >
                    Gestión Onboarding
                </button>
                <button
                    className={subTab === 'eecc' ? 'active' : ''}
                    onClick={() => setSubTab('eecc')}
                >
                    Ejercicios (EECC)
                </button>
                {/* ... existing buttons ... */}
                <button
                    className={subTab === 'productos' ? 'active' : ''}
                    onClick={() => setSubTab('productos')}
                >
                    Planes y Onboardings
                </button>
                <button
                    className={subTab === 'descuentos' ? 'active' : ''}
                    onClick={() => setSubTab('descuentos')}
                >
                    Descuentos
                </button>
                <button
                    className={subTab === 'objetivos' ? 'active' : ''}
                    onClick={() => setSubTab('objetivos')}
                >
                    Objetivos
                </button>
            </div>

            <div className="admin-comercial-content">
                {subTab === 'onboarding' && <OnboardingManagement />}
                {subTab === 'eecc' && <AdminEECC />}
                {subTab === 'productos' && <AdminProductos />}
                {subTab === 'descuentos' && <AdminDescuentos />}
                {subTab === 'objetivos' && <AdminObjetivos />}
            </div>
        </div>
    )
}
