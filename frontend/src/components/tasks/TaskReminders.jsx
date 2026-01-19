// frontend/src/components/tasks/TaskReminders.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiClock, FiX, FiTrash2, FiBell, FiMail, FiLayout, FiCalendar } from 'react-icons/fi';
import { tareasApi } from '../../api/tareas';
import { useToast } from '../toast/ToastProvider';
import './TaskReminders.scss';

const QUICK_OPTIONS = [
    { label: '15m', minutes: 15 },
    { label: '1h', minutes: 60 },
    { label: '4h', minutes: 240 },
    { label: 'Mañana', minutes: 1440 },
];

export default function TaskReminders({ taskId }) {
    const [open, setOpen] = useState(false);
    const [reminders, setReminders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [customDate, setCustomDate] = useState('');
    const [customTime, setCustomTime] = useState('');
    const [tipo, setTipo] = useState('hub');
    const toast = useToast();
    const btnRef = useRef(null);
    const popRef = useRef(null);

    // Cargar recordatorios
    const fetchReminders = async () => {
        try {
            const data = await tareasApi.getRecordatorios(taskId);
            setReminders(data);
        } catch (e) {
            console.error('Error cargando recordatorios:', e);
        }
    };

    useEffect(() => {
        if (open) fetchReminders();
    }, [open, taskId]);

    // Click outside to close
    useEffect(() => {
        if (!open) return;
        const handleClick = (e) => {
            if (popRef.current && !popRef.current.contains(e.target) && !btnRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    const handleQuickAdd = async (minutes) => {
        if (loading) return;
        setLoading(true);
        try {
            const fecha = new Date(Date.now() + minutes * 60 * 1000);
            await tareasApi.addRecordatorio(taskId, { fecha_recordatorio: fecha.toISOString(), tipo });
            toast.success('Recordatorio creado');
            fetchReminders();
        } catch (e) {
            toast.error('Error al crear recordatorio');
        } finally {
            setLoading(false);
        }
    };

    const handleCustomAdd = async () => {
        if (!customDate || !customTime) {
            toast.error('Seleccioná fecha y hora');
            return;
        }
        if (loading) return;
        setLoading(true);
        try {
            const fecha = new Date(`${customDate}T${customTime}`);
            await tareasApi.addRecordatorio(taskId, { fecha_recordatorio: fecha.toISOString(), tipo });
            toast.success('Recordatorio creado');
            setCustomDate('');
            setCustomTime('');
            fetchReminders();
        } catch (e) {
            toast.error('Error al crear recordatorio');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (remId) => {
        try {
            await tareasApi.deleteRecordatorio(taskId, remId);
            toast.success('Recordatorio eliminado');
            fetchReminders();
        } catch (e) {
            toast.error('Error al eliminar');
        }
    };

    const formatDate = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // Calculate position for popover
    const [popPos, setPopPos] = useState({ top: 0, left: 0 });
    useEffect(() => {
        if (open && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setPopPos({
                top: rect.bottom + window.scrollY + 8,
                left: rect.right + window.scrollX - 320 // Width is 320
            });
        }
    }, [open]);

    return (
        <div className="TaskReminders">
            <button
                ref={btnRef}
                type="button"
                className={`reminder-btn ${open ? 'is-open' : ''} ${reminders.length > 0 ? 'has-reminders' : ''}`}
                onClick={() => setOpen(!open)}
                title="Configurar recordatorio"
            >
                <FiBell />
                {reminders.length > 0 && <span className="badge">{reminders.length}</span>}
            </button>

            {open && createPortal(
                <div
                    className="reminder-popover"
                    ref={popRef}
                    style={{
                        position: 'absolute',
                        top: popPos.top,
                        left: popPos.left,
                        zIndex: 9999
                    }}
                >
                    <div className="pop-header">
                        <div className="ttl-box">
                            <FiBell className="ico" />
                            <span>Recordatorios</span>
                        </div>
                        <button type="button" className="close-btn" onClick={() => setOpen(false)}>
                            <FiX />
                        </button>
                    </div>

                    <div className="pop-body">
                        {/* Quick options */}
                        <div className="section">
                            <span className="section-label">Recordarme en:</span>
                            <div className="quick-grid">
                                {QUICK_OPTIONS.map(opt => (
                                    <button
                                        key={opt.label}
                                        type="button"
                                        className="quick-btn"
                                        onClick={() => handleQuickAdd(opt.minutes)}
                                        disabled={loading}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom date/time */}
                        <div className="section">
                            <span className="section-label">Fecha y hora personalizada:</span>
                            <div className="custom-row">
                                <div className="input-group">
                                    <div className="input-with-icon">
                                        <FiCalendar className="field-icon" />
                                        <input
                                            type="date"
                                            value={customDate}
                                            onChange={e => setCustomDate(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                    <div className="input-with-icon">
                                        <FiClock className="field-icon" />
                                        <input
                                            type="time"
                                            value={customTime}
                                            onChange={e => setCustomTime(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="add-custom-btn"
                                    onClick={handleCustomAdd}
                                    disabled={loading || !customDate || !customTime}
                                >
                                    Guardar
                                </button>
                            </div>
                        </div>

                        {/* Notification type */}
                        <div className="section">
                            <span className="section-label">¿Cómo notificamos?</span>
                            <div className="tipo-tabs">
                                <button
                                    type="button"
                                    className={`tab ${tipo === 'hub' ? 'active' : ''}`}
                                    onClick={() => setTipo('hub')}
                                >
                                    <FiLayout /> Hub
                                </button>
                                <button
                                    type="button"
                                    className={`tab ${tipo === 'email' ? 'active' : ''}`}
                                    onClick={() => setTipo('email')}
                                >
                                    <FiMail /> Email
                                </button>
                                <button
                                    type="button"
                                    className={`tab ${tipo === 'both' ? 'active' : ''}`}
                                    onClick={() => setTipo('both')}
                                >
                                    Ambos
                                </button>
                            </div>
                        </div>

                        {/* Existing reminders */}
                        {reminders.length > 0 && (
                            <div className="section existing">
                                <span className="section-label">Configurados:</span>
                                <div className="rem-list">
                                    {reminders.map(r => (
                                        <div className="rem-item" key={r.id}>
                                            <div className="rem-info">
                                                <span className="d">{formatDate(r.fecha_recordatorio)}</span>
                                                <span className="t">{r.tipo === 'both' ? 'Hub + Email' : r.tipo}</span>
                                            </div>
                                            <button type="button" className="del-btn" onClick={() => handleDelete(r.id)}>
                                                <FiTrash2 />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
