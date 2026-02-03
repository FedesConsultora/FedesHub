import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { tareasApi } from '../../../api/tareas';
import OnePagerTable from './OnePagerTable';
import ModalPanel from '../components/ModalPanel';
import TaskDetail from '../TaskDetail';
import TaskHistory from '../../../components/tasks/TaskHistory';
import { useToast } from '../../../components/toast/ToastProvider';
import { IoChevronDownOutline } from "react-icons/io5";
import { FiArrowLeft } from 'react-icons/fi';

import './OnePager.scss';

export default function OnePagerPage() {
    const navigate = useNavigate();
    const toast = useToast();
    const [clients, setClients] = useState([]);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [filterType, setFilterType] = useState('ALL'); // 'ALL', 'IT', 'TC'
    const [data, setData] = useState([]);
    const [summaryData, setSummaryData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [catalog, setCatalog] = useState(null);

    // Estados para Modales
    const [openTaskId, setOpenTaskId] = useState(null);
    const [showHistoryId, setShowHistoryId] = useState(null);

    const fetchSummary = useCallback(() => {
        setLoading(true);
        tareasApi.getOnePagerSummary()
            .then(res => setSummaryData(res))
            .catch(err => console.error('Error loading summary:', err))
            .finally(() => setLoading(false));
    }, []);

    // Cargar Catálogo (clientes y más)
    useEffect(() => {
        tareasApi.catalog().then(c => {
            setCatalog(c);
            if (c.clientes) {
                setClients(c.clientes.sort((a, b) => a.nombre.localeCompare(b.nombre)));
            }
        }).catch(err => console.error('Error loading catalog:', err));

        // Cargar sumario inicial
        fetchSummary();
    }, [fetchSummary]);

    const fetchData = useCallback(() => {
        if (!selectedClientId) {
            setData([]);
            return;
        }

        setLoading(true);
        tareasApi.getOnePager(selectedClientId, { tipo: 'ALL' })
            .then(res => {
                setData(res);
            })
            .catch(err => {
                console.error('Error loading One Pager data:', err);
                setData([]);
            })
            .finally(() => setLoading(false));
    }, [selectedClientId]);

    // Cargar Data cuando cambia el cliente
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handler para actualización optimista
    const handleUpdateRow = useCallback(async (taskId, fields) => {
        // 1) Actualización Optimista (Local state remains flat)
        const flatFields = { ...fields };
        if (flatFields.tc) {
            Object.assign(flatFields, flatFields.tc);
            delete flatFields.tc;
        }

        setData(current => current.map(t =>
            t.id === taskId ? { ...t, ...flatFields } : t
        ));

        // 2) Persistir en Backend
        try {
            await tareasApi.update(taskId, fields);
            console.log('Update successful for task', taskId);

            // 3) Notificar a otros componentes (ej. Modal Detail si está abierto)
            window.dispatchEvent(new CustomEvent('task-updated', {
                detail: { taskId, fields: flatFields }
            }));

            return true;
        } catch (err) {
            console.error('Error updating task:', err);
            const msg = err.response?.data?.message || err.message || 'Error al actualizar la tarea';
            toast?.error(msg);
            // Si falla, recargar data para asegurar sincronización (revert optimista)
            fetchData();
            return false;
        }
    }, [fetchData, toast]);

    // Filtrado en Frontend
    const filteredData = useMemo(() => {
        if (filterType === 'ALL') return data;
        return data.filter(t => t.tipo === filterType);
    }, [data, filterType]);

    return (
        <div className="OnePagerPage">
            <header className="toolbar">
                <div className="left">
                    <button className="back-btn" onClick={() => navigate('/tareas')} title="Volver a Tareas">
                        <FiArrowLeft />
                    </button>
                    <h1>One Pager</h1>
                </div>

                <div className="center">
                    <div className="client-selector">
                        <select
                            value={selectedClientId}
                            onChange={(e) => setSelectedClientId(e.target.value)}
                        >
                            <option value="">Seleccionar Cliente   </option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}

                        </select>

                    </div>
                </div>

                <div className="right">
                    <div className="type-toggle">
                        <button
                            className={filterType === 'ALL' ? 'active' : ''}
                            onClick={() => setFilterType('ALL')}
                        >
                            Todos
                        </button>
                        <button
                            className={filterType === 'IT' ? 'active' : ''}
                            onClick={() => setFilterType('IT')}
                        >
                            IT
                        </button>
                        <button
                            className={filterType === 'TC' ? 'active' : ''}
                            onClick={() => setFilterType('TC')}
                        >
                            TC
                        </button>
                    </div>
                </div>
            </header>

            {selectedClientId ? (
                <OnePagerTable
                    data={filteredData}
                    loading={loading}
                    filterType={filterType}
                    catalog={catalog}
                    onOpenTask={setOpenTaskId}
                    onOpenHistory={setShowHistoryId}
                    onUpdate={handleUpdateRow}
                />
            ) : (
                <div className="summary-dashboard anim-fade-in">
                    <div className="summary-grid">
                        {summaryData.map(c => (
                            <div
                                key={c.id}
                                className="summary-card"
                                onClick={() => setSelectedClientId(c.id)}
                            >
                                <div className="card-content">
                                    <div className="client-name">{c.nombre}</div>
                                    <div className="task-count">
                                        <span className={`count ${c.pending_count > 0 ? 'has-tasks' : ''}`}>
                                            {c.pending_count}
                                        </span>
                                        <span className="label">tareas pendientes</span>
                                    </div>
                                </div>
                                <div className="card-footer">
                                    <span>Ver One Pager</span>
                                    <i className="fi fi-rr-arrow-right"></i>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal para Editar Tarea */}
            {openTaskId && (
                <ModalPanel
                    open={!!openTaskId}
                    onClose={() => setOpenTaskId(null)}
                >
                    <TaskDetail
                        taskId={openTaskId}
                        onUpdated={fetchData}
                        onClose={() => setOpenTaskId(null)}
                    />
                </ModalPanel>
            )}

            {/* Modal para Historial */}
            {showHistoryId && (
                <ModalPanel
                    open={!!showHistoryId}
                    onClose={() => setShowHistoryId(null)}
                >
                    <div style={{ padding: '20px', minWidth: '600px' }}>
                        <TaskHistory taskId={showHistoryId} />
                    </div>
                </ModalPanel>
            )}
        </div>
    );
}
