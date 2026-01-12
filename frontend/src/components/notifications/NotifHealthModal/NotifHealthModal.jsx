import React, { useState } from 'react'
import { FiAlertTriangle, FiCheckCircle, FiPlay, FiBell, FiX } from 'react-icons/fi'
import { useRealtime } from '../../../realtime/RealtimeProvider'
import './NotifHealthModal.scss'

export default function NotifHealthModal({ isOpen, onClose }) {
    const { notifPermission, requestNotificationPermission, playTest, volume, getHealthReport } = useRealtime()
    const [testResult, setTestResult] = useState(null)
    const [showTechnical, setShowTechnical] = useState(false)

    if (!isOpen) return null

    const health = getHealthReport()

    const handleRequest = async () => {
        const res = await requestNotificationPermission()
        if (res === 'granted') {
            setTestResult('Permission granted!')
        } else {
            setTestResult('Permission denied or dismissed.')
        }
    }

    const handleTestSound = () => {
        playTest()
        setTestResult('Sound sent. Did you hear it?')
    }

    return (
        <div className="fhNotifHealthOverlay">
            <div className="fhNotifHealthModal">
                <header>
                    <h2><FiBell /> Sistema de Notificaciones</h2>
                    <button className="closeBtn" onClick={onClose}><FiX /></button>
                </header>

                <main>
                    <div className="statusSection">
                        <div className="statusItem">
                            <span className="lbl">Permisos del Navegador:</span>
                            <span className={`val ${notifPermission}`}>
                                {notifPermission === 'granted' ? <FiCheckCircle /> : <FiAlertTriangle />}
                                {notifPermission === 'granted' ? 'Habilitado' :
                                    notifPermission === 'denied' ? 'Bloqueado' : 'Pendiente'}
                            </span>
                        </div>

                        {notifPermission !== 'granted' && (
                            <div className="alert-box">
                                <FiAlertTriangle />
                                <p>Las notificaciones están desactivadas. No recibirás avisos visuales ni sonoros mientras la pestaña esté en segundo plano.</p>
                                <button className="actionBtn" onClick={handleRequest}>Habilitar Notificaciones</button>
                            </div>
                        )}
                    </div>

                    <div className="diagnosticActions">
                        <h3>Pruebas de Diagnóstico</h3>
                        <p className="sub">Usá estos botones para verificar que tu equipo esté configurado correctamente.</p>

                        <div className="btns">
                            <button className="diagBtn" onClick={handleTestSound}>
                                <FiPlay /> Probar Sonido (Alert)
                            </button>
                            <button className="diagBtn" onClick={() => playTest()}>
                                <FiBell /> Probar Banner
                            </button>
                        </div>
                    </div>

                    {testResult && <div className="testResult">{testResult}</div>}

                    <div className="technicalInfo">
                        <button className="toggleTech" onClick={() => setShowTechnical(!showTechnical)}>
                            {showTechnical ? 'Ocultar info técnica' : 'Ver info técnica'}
                        </button>
                        {showTechnical && (
                            <pre className="debugData">
                                {JSON.stringify(health, null, 2)}
                            </pre>
                        )}
                    </div>
                </main>

                <footer>
                    <p>Volumen actual del sistema: <strong>{Math.round(volume * 100)}%</strong></p>
                    <button className="doneBtn" onClick={onClose}>Listo</button>
                </footer>
            </div>
        </div>
    )
}
