// frontend/src/pages/Admin/Comercial/AdminObjetivos.jsx
import React, { useState, useEffect } from 'react'
import { comercialApi } from '../../../api/comercial'
import { FiSave, FiTarget, FiPercent, FiTrendingUp, FiInfo, FiHelpCircle, FiCalendar, FiDollarSign, FiChevronRight } from 'react-icons/fi'
import { useToast } from '../../../components/toast/ToastProvider'
import { parseLocaleAmount, cleanPriceInput } from '../../../utils/format'

export default function AdminObjetivos() {
    const [eeccList, setEeccList] = useState([])
    const [selectedEecc, setSelectedEecc] = useState('')
    const [data, setData] = useState({ q: [], mes: [], caps: [] })
    const [loading, setLoading] = useState(false)
    const [activeQTab, setActiveQTab] = useState(1) // Tab for monthly section
    const [showHelp, setShowHelp] = useState({ proyectado: false, topes: false, facturacion: false })
    const toast = useToast()

    // Row states for monthly table
    const [monthlyInputs, setMonthlyInputs] = useState({})

    useEffect(() => {
        comercialApi.listEECC().then(res => {
            const list = res.data || []
            setEeccList(list)
            if (list.length > 0) setSelectedEecc(list[0].id)
        })
    }, [])

    useEffect(() => {
        if (selectedEecc) loadObjetivos(selectedEecc)
    }, [selectedEecc])

    useEffect(() => {
        if (data.mes) {
            const initial = {}
            data.mes.forEach(m => {
                initial[`onb-${m.mes_calendario}`] = m.qty_onb_mercado || 0
                initial[`plan-${m.mes_calendario}`] = m.qty_plan_prom || 0
            })
            setMonthlyInputs(initial)
        }
    }, [data.mes])

    const loadObjetivos = async (id) => {
        setLoading(true)
        try {
            const res = await comercialApi.listObjetivos(id)
            setData(res.data)
        } catch (e) {
            toast.error('Error al cargar objetivos')
        } finally {
            setLoading(false)
        }
    }

    const handleSaveQ = async (qNum, valString) => {
        const val = parseLocaleAmount(valString)
        try {
            await comercialApi.upsertObjetivoQ({
                eecc_id: selectedEecc,
                q: qNum,
                monto_presupuestacion_ars: val
            })
            toast.success(`Objetivo Q${qNum} guardado`)
        } catch (e) {
            toast.error('Error al guardar')
        }
    }

    const handleSaveCap = async (qNum, valString) => {
        const val = parseLocaleAmount(valString)
        try {
            await comercialApi.upsertDescuentoCap({
                eecc_id: selectedEecc,
                q: qNum,
                monto_maximo_ars: val
            })
            toast.success(`Tope Descuento Q${qNum} guardado`)
        } catch (e) {
            toast.error('Error al guardar')
        }
    }

    const handleSaveMes = async (mes) => {
        const onb = monthlyInputs[`onb-${mes}`] || 0
        const plan = monthlyInputs[`plan-${mes}`] || 0
        try {
            await comercialApi.upsertObjetivoMes({
                eecc_id: selectedEecc,
                mes_calendario: mes,
                qty_onb_mercado: parseInt(onb) || 0,
                qty_plan_prom: parseInt(plan) || 0
            })
            toast.success(`Objetivo Mensual (${mes}) guardado`)
            loadObjetivos(selectedEecc)
        } catch (e) {
            toast.error('Error al guardar')
        }
    }

    const handleMonthlyInputChange = (key, val) => {
        setMonthlyInputs(prev => ({ ...prev, [key]: val }))
    }

    const toggleHelp = (key) => {
        setShowHelp(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const getStartMonth = () => {
        const eecc = eeccList.find(e => Number(e.id) === Number(selectedEecc))
        if (!eecc) return 1
        return new Date(eecc.start_at).getUTCMonth() + 1
    }

    const getMonthsForQ = (q) => {
        const startMonth = getStartMonth()
        return [
            ((startMonth - 1 + (q - 1) * 3) % 12) + 1,
            ((startMonth - 1 + (q - 1) * 3 + 1) % 12) + 1,
            ((startMonth - 1 + (q - 1) * 3 + 2) % 12) + 1
        ]
    }

    if (!selectedEecc && eeccList.length === 0) return (
        <div className="AdminEmptyState">
            <FiCalendar />
            <p>Primero debés crear un Ejercicio Contable (EECC) para poder cargar sus objetivos.</p>
        </div>
    )

    return (
        <div className="AdminObjetivos">
            <header className="admin-list-header">
                <div className="title-area">
                    <h3>Configuración de Objetivos Comercial</h3>
                    <p className="subtitle">Definí el norte de tu equipo para este ejercicio contable.</p>
                </div>
                <div className="eecc-selector premium-select-wrap">
                    <label>Ejercicio Activo</label>
                    <select value={selectedEecc} onChange={e => setSelectedEecc(e.target.value)}>
                        {eeccList.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                    </select>
                </div>
            </header>

            <div className="objetivos-grid">
                {/* Quarterly Goals */}
                <section className={`objetivos-section ${showHelp.proyectado ? 'help-open' : ''}`}>
                    <header className="section-header">
                        <h4><FiTarget /> Presupuestación Proyectada</h4>
                        <button className="help-toggle-btn" onClick={() => toggleHelp('proyectado')}>
                            <FiHelpCircle />
                        </button>
                    </header>

                    {showHelp.proyectado && (
                        <div className="help-box-anim">
                            <p><strong>¿Qué es esto?</strong> Es la suma de los montos de todos los leads que el equipo comercial proyecta tener en la etapa de presupuesto durante cada trimestre.</p>
                            <p><strong>¿Para qué sirve?</strong> Para calcular el `% de Cumplimiento` en el dashboard de "Presupuestado vs Objetivo".</p>
                        </div>
                    )}

                    <p className="section-desc">Monto total ($ ARS) esperado en leads presupuestados.</p>
                    <div className="q-grid-v3">
                        {[1, 2, 3, 4].map(qNum => {
                            const obj = data.q.find(o => o.q === qNum)
                            return (
                                <div key={`${selectedEecc}-${qNum}`} className="premium-input-field">
                                    <label>Q{qNum}</label>
                                    <div className="input-with-symbol">
                                        <span className="symbol">$</span>
                                        <input
                                            key={`${selectedEecc}-${qNum}-${obj?.monto_presupuestacion_ars}`}
                                            type="text"
                                            readOnly
                                            className="read-only-input"
                                            value={obj?.monto_presupuestacion_ars ? parseFloat(obj.monto_presupuestacion_ars).toLocaleString('es-AR') : '0'}
                                        />
                                        <span className="auto-badge">Auto</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>

                <section className={`objetivos-section ${showHelp.topes ? 'help-open' : ''}`}>
                    <header className="section-header">
                        <h4><FiPercent /> Tope de Bonificaciones</h4>
                        <button className="help-toggle-btn" onClick={() => toggleHelp('topes')}>
                            <FiHelpCircle />
                        </button>
                    </header>

                    {showHelp.topes && (
                        <div className="help-box-anim">
                            <p><strong>¿Qué es esto?</strong> El "bolsillo" total que tiene el equipo comercial para otorgar descuentos por cada trimestre.</p>
                            <p><strong>Impacto:</strong> El sistema impedirá cerrar una venta si la bonificación solicitada supera este remanente trimestral.</p>
                        </div>
                    )}

                    <p className="section-desc">Límite de descuentos ($ ARS) permitidos por cada Q.</p>
                    <div className="q-grid-v3">
                        {[1, 2, 3, 4].map(qNum => {
                            const cap = data.caps.find(c => c.q === qNum)
                            return (
                                <div key={`${selectedEecc}-cap-${qNum}`} className="premium-input-field">
                                    <label>Q{qNum}</label>
                                    <div className="input-with-symbol">
                                        <span className="symbol">$</span>
                                        <input
                                            key={`${selectedEecc}-cap-${qNum}-${cap?.monto_maximo_ars}`}
                                            type="text"
                                            readOnly
                                            className="read-only-input"
                                            value={cap?.monto_maximo_ars ? parseFloat(cap.monto_maximo_ars).toLocaleString('es-AR') : '0'}
                                        />
                                        <span className="auto-badge">Auto</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>
            </div>

            <section className={`objetivos-section full-width ${showHelp.facturacion ? 'help-open' : ''}`}>
                <header className="section-header">
                    <div className="title-with-tabs">
                        <h4><FiTrendingUp /> Objetivos de Facturación (Unidades)</h4>
                        <div className="quarter-tabs">
                            {[1, 2, 3, 4].map(q => (
                                <button
                                    key={q}
                                    className={activeQTab === q ? 'active' : ''}
                                    onClick={() => setActiveQTab(q)}
                                >
                                    Q{q}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button className="help-toggle-btn" onClick={() => toggleHelp('facturacion')}>
                        <FiHelpCircle />
                    </button>
                </header>

                {showHelp.facturacion && (
                    <div className="help-box-anim">
                        <p><strong>Unidades:</strong> Indicá cuántos Onboardings y cuántos Planes esperás vender por mes.</p>
                        <p><strong>Valuación:</strong> Se calcula multiplicando las unidades por el "Precio de Lista" actual de los productos tipo Onboarding y Plan Promedio.</p>
                    </div>
                )}

                <div className="mes-table-v3-wrap">
                    <table className="mes-table-v3">
                        <thead>
                            <tr>
                                <th>Mes</th>
                                <th>Onboardings (Units)</th>
                                <th>Planes (Units)</th>
                                <th className="val-col">Facturación Est.</th>
                                <th className="action-col"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {getMonthsForQ(activeQTab).map(m => {
                                const obj = data.mes.find(o => o.mes_calendario === m)
                                const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                                return (
                                    <tr key={m}>
                                        <td className="month-cell">
                                            <div className="m-info">
                                                <span className="m-name">{monthNames[m - 1]}</span>
                                                <span className="m-num">Mes {m}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="mini-input-wrap">
                                                <input
                                                    type="number"
                                                    value={monthlyInputs[`onb-${m}`] || ''}
                                                    onChange={e => handleMonthlyInputChange(`onb-${m}`, e.target.value)}
                                                    placeholder="0"
                                                />
                                            </div>
                                        </td>
                                        <td>
                                            <div className="mini-input-wrap">
                                                <input
                                                    type="number"
                                                    value={monthlyInputs[`plan-${m}`] || ''}
                                                    onChange={e => handleMonthlyInputChange(`plan-${m}`, e.target.value)}
                                                    placeholder="0"
                                                />
                                            </div>
                                        </td>
                                        <td className="val-col">
                                            <div className="val-estimate">
                                                <span className="curr">$</span>
                                                <span className="amount">{parseFloat(obj?.total_objetivo_ars || 0).toLocaleString('es-AR', { minimumFractionDigits: 0 })}</span>
                                            </div>
                                        </td>
                                        <td className="action-col">
                                            <button
                                                className="btn-save-mes"
                                                onClick={() => handleSaveMes(m)}
                                            >
                                                <FiSave />
                                                <span>Guardar</span>
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="q-total-summary">
                    <span>Total Trimestral Estimado (Q{activeQTab}):</span>
                    <strong>$ {
                        data.mes
                            .filter(m => getMonthsForQ(activeQTab).includes(m.mes_calendario))
                            .reduce((acc, curr) => acc + parseFloat(curr.total_objetivo_ars || 0), 0)
                            .toLocaleString('es-AR', { minimumFractionDigits: 0 })
                    }</strong>
                </div>
            </section>
        </div>
    )
}
