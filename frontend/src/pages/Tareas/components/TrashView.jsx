import { useEffect, useState } from 'react';
import { tareasApi } from '../../../api/tareas';
import { useToast } from '../../../components/toast/ToastProvider';
import { FiRefreshCw, FiTrash2, FiClock } from 'react-icons/fi';
import './trash-view.scss';

export default function TrashView({ onRestore }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    useEffect(() => {
        loadTrash();
    }, []);

    const loadTrash = async () => {
        setLoading(true);
        try {
            const data = await tareasApi.listTrash();
            setTasks(data);
        } catch (err) {
            console.error('Error loading trash:', err);
            toast?.error('No se pudo cargar la papelera');
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (id) => {
        try {
            await tareasApi.restore(id);
            toast?.success('Tarea restaurada');
            setTasks(prev => prev.filter(t => t.id !== id));
            onRestore?.(id);
        } catch (err) {
            console.error('Error restoring task:', err);
            toast?.error('No se pudo restaurar la tarea');
        }
    };

    const getRemainingDays = (deletedAt) => {
        const deletedDate = new Date(deletedAt);
        const expireDate = new Date(deletedDate);
        expireDate.setMonth(expireDate.getMonth() + 2);

        const now = new Date();
        const diffTime = expireDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays > 0 ? diffDays : 0;
    };

    if (loading) return <div className="trash-view-loading">Cargando papelera...</div>;

    return (
        <div className="TrashView">
            {tasks.length === 0 ? (
                <div className="empty-trash">
                    <FiTrash2 className="icon" />
                    <p>La papelera está vacía</p>
                </div>
            ) : (
                <div className="trash-list">
                    {tasks.map(task => (
                        <div key={task.id} className="trash-item card">
                            <div className="info">
                                <div className="top">
                                    <span className="id">#{task.id}</span>
                                    {task.cliente_nombre && (
                                        <span
                                            className="client-tag"
                                            style={{ '--client-color': task.color || '#999' }}
                                        >
                                            {task.cliente_nombre}
                                        </span>
                                    )}
                                </div>
                                <h3 className="title">{task.titulo}</h3>
                                <div className="meta">
                                    <span className="author">Eliminada por {task.autor_nombre} {task.autor_apellido}</span>
                                    <span className="expiry">
                                        <FiClock /> Quedan {getRemainingDays(task.deleted_at)} días
                                    </span>
                                </div>
                            </div>
                            <div className="actions">
                                <button
                                    className="restore-btn"
                                    onClick={() => handleRestore(task.id)}
                                    title="Restaurar tarea"
                                >
                                    <FiRefreshCw /> Restaurar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
