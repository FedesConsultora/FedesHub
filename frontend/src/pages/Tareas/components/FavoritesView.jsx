import { useEffect, useState } from 'react';
import { tareasApi } from '../../../api/tareas';
import { useToast } from '../../../components/toast/ToastProvider';
import { FiStar, FiSlash } from 'react-icons/fi';
import './favorites-view.scss';

export default function FavoritesView({ onRemoveFavorite }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    useEffect(() => {
        loadFavorites();
    }, []);

    const loadFavorites = async () => {
        setLoading(true);
        try {
            // Filtramos tareas con is_favorita = true
            const { rows } = await tareasApi.list({ is_favorita: true, limit: 100 });
            setTasks(rows);
        } catch (err) {
            console.error('Error loading favorites:', err);
            toast?.error('No se pudo cargar los destacados');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleFavorite = async (id) => {
        try {
            await tareasApi.toggleFavorito(id, false);
            toast?.success('Tarea quitada de destacados');
            setTasks(prev => prev.filter(t => t.id !== id));
            onRemoveFavorite?.(id);
        } catch (err) {
            console.error('Error removing favorite:', err);
            toast?.error('No se pudo quitar de destacados');
        }
    };

    if (loading) return <div className="favorites-view-loading">Cargando destacados...</div>;

    return (
        <div className="FavoritesView">
            {tasks.length === 0 ? (
                <div className="empty-favorites">
                    <FiStar className="icon" />
                    <p>No tenés tareas destacadas</p>
                </div>
            ) : (
                <div className="favorites-list">
                    {tasks.map(task => (
                        <div key={task.id} className="favorite-item card">
                            <div className="info">
                                <div className="top">
                                    <span className="id">#{task.id}</span>
                                    {task.cliente_nombre && (
                                        <span
                                            className="client-tag"
                                            style={{
                                                '--client-color': task.cliente_color || '#999',
                                                '--client-color-rgb': task.cliente_color ? '' : '150, 150, 150'
                                            }}
                                        >
                                            {task.cliente_nombre}
                                        </span>
                                    )}
                                </div>
                                <h3 className="title">{task.titulo || task.title}</h3>
                                <div className="meta">
                                    <span className="status" style={{ color: task.estado_color || 'var(--text-muted)' }}>
                                        {task.estado_nombre || task.status?.name}
                                    </span>
                                </div>
                            </div>
                            <div className="actions">
                                <button
                                    className="remove-btn"
                                    onClick={() => handleToggleFavorite(task.id)}
                                    title="Quitar de destacados"
                                >
                                    <FiSlash /> Quitar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
