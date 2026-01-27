import React, { useState, useEffect } from 'react'
import { FiAlertTriangle, FiCheckCircle, FiPlay, FiBell, FiX, FiShield, FiVolume2, FiEye, FiZap, FiTarget } from 'react-icons/fi'
import { useRealtime } from '../../../realtime/RealtimeProvider'
import './NotifHealthModal.scss'

export default function NotifHealthModal({ isOpen, onClose }) {
    const {
        notifPermission,
        requestNotificationPermission,
        playTest,
        volume,
        setVolume,
        getHealthReport,
        audioUnlocked,
        unlockAudioManually
    } = useRealtime()

    const [testResult, setTestResult] = useState(null)
    const [showTechnical, setShowTechnical] = useState(false)
    const [drillActive, setDrillActive] = useState(false)
    const [countdown, setCountdown] = useState(0)

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
            return () => clearTimeout(timer)
        } else if (drillActive) {
            setDrillActive(false)
            setTestResult('🚀 Simulacro disparado. ¡Deberías ver el banner!')
        }
    }, [countdown, drillActive])

    if (!isOpen) return null

    const health = getHealthReport()

    const handleRequest = async () => {
        const res = await requestNotificationPermission()
        if (res === 'granted') {
            setTestResult('✅ ¡Permisos concedidos!')
        } else {
            setTestResult('❌ Permisos denegados o cerrados.')
        }
    }

    const handleBackgroundDrill = () => {
        setDrillActive(true)
        setCountdown(5)
        playTest(5000)
        setTestResult('⏱ Simulacro iniciado. Ocultá el navegador AHORA...')
    }

    const handleUnlockAudio = async () => {
        try {
            await unlockAudioManually()
            setTestResult('🔊 Audio desbloqueado. ¿Escuchaste el bip?')
        } catch (error) {
            console.error('Error unlocking audio:', error)
            setTestResult('❌ Error al desbloquear audio.')
        }
    }

    return (
        <div className="fhNotifHealthOverlay" onClick={onClose}>
            <div className="fhNotifHealthModal" onClick={e => e.stopPropagation()}>
                <header className="fixed-header">
                    <h2><FiShield /> Centro de Diagnóstico</h2>
                    <button className="closeBtn" onClick={onClose} aria-label="Cerrar"><FiX /></button>
                </header>

                <div className="scrollable-body">
                    <main>
                        <div className="statusGrid">
                            <div className="statusCard">
                                <span className="icon"><FiBell /></span>
                                <div className="info">
                                    <span className="label">Permisos</span>
                                    <span className={`value ${notifPermission}`}>
                                        {notifPermission === 'granted' ? 'Activos' : 'Inactivos'}
                                    </span>
                                </div>
                            </div>
                            <div className="statusCard">
                                <span className="icon"><FiVolume2 /></span>
                                <div className="info">
                                    <span className="label">Audio</span>
                                    <span className={`value ${audioUnlocked ? 'granted' : 'denied'}`}>
                                        {audioUnlocked ? 'Desbloqueado' : 'Bloqueado'}
                                    </span>
                                </div>
                            </div>
                            <div className="statusCard">
                                <span className="icon"><FiEye /></span>
                                <div className="info">
                                    <span className="label">Visibilidad</span>
                                    <span className={`value ${health.isWindowVisible ? 'granted' : 'denied'}`}>
                                        {health.isWindowVisible ? 'En Foco' : 'Oculta'}
                                    </span>
                                </div>
                            </div>
                            <div className="statusCard">
                                <span className="icon"><FiZap /></span>
                                <div className="info">
                                    <span className="label">Pestaña</span>
                                    <span className={`value ${health.isMasterTab ? 'granted' : 'denied'}`}>
                                        {health.isMasterTab ? 'Master Audio' : 'Secundaria'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {notifPermission !== 'granted' && (
                            <div className="action-box warning">
                                <FiAlertTriangle />
                                <div className="content">
                                    <strong>Notificaciones Desactivadas</strong>
                                    <p>Sin permisos no verás banners cuando no estés mirando la pestaña.</p>
                                    <button className="btn primary" onClick={handleRequest}>Permitir ahora</button>
                                </div>
                            </div>
                        )}

                        {!audioUnlocked && (
                            <div className="action-box info">
                                <FiVolume2 />
                                <div className="content">
                                    <strong>Audio Bloqueado por el Navegador</strong>
                                    <p>El navegador impide sonidos hasta que interactúe con la página. Click abajo para arreglar.</p>
                                    <button className="btn secondary" onClick={handleUnlockAudio}>Desbloquear Audio Ahora</button>
                                </div>
                            </div>
                        )}

                        {audioUnlocked && !health.isMasterTab && (
                            <div className="action-box info">
                                <FiZap />
                                <div className="content">
                                    <strong>Pestaña Secundaria</strong>
                                    <p>Esta pestaña no emitirá sonidos. Otra pestaña del Hub es la responsable del audio.</p>
                                </div>
                            </div>
                        )}

                        <div className="drillingArea">
                            <h3>Simulacros de Respuesta</h3>
                            <p>Usá estas herramientas para asegurar que todo llegue.</p>

                            <div className="drillBtns">
                                <button className="drillBtn" onClick={() => playTest()}>
                                    <FiPlay /> Probar Inmediato
                                </button>

                                <button className={`drillBtn ${drillActive ? 'active' : ''}`} onClick={handleBackgroundDrill} disabled={drillActive}>
                                    {drillActive ? <span className="counter">{countdown}s</span> : <FiTarget />}
                                    {drillActive ? 'Ocultá la ventana...' : 'Simulacro Background (5s)'}
                                </button>
                            </div>
                        </div>

                        {testResult && (
                            <div className="testFeedback">
                                {testResult}
                            </div>
                        )}

                        <div className="technicalInfo">
                            <button className="toggleTech" onClick={() => setShowTechnical(!showTechnical)}>
                                {showTechnical ? 'Ocultar consola técnica' : 'Ver consola técnica'}
                            </button>
                            {showTechnical && (
                                <pre className="debugData">
                                    {JSON.stringify(health, null, 2)}
                                </pre>
                            )}
                        </div>
                    </main>
                </div>

                <footer className="fixed-footer">
                    <div className="volumeControl">
                        <FiVolume2 />
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volume}
                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                            className="volumeSlider"
                        />
                        <span className="volPercent">{Math.round(volume * 100)}%</span>
                    </div>
                    <button className="doneBtn" onClick={onClose}>Listo</button>
                </footer>
            </div>
        </div>
    )
}
