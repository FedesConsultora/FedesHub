import React from 'react';
import { useNavigate } from 'react-router-dom';
import { notifApi } from '../../api/notificaciones';
import { useRealtime } from '../../realtime/RealtimeProvider';
import './tasks.scss';

export default function DashboardUnread({ notifications, onOpenTask, onRefresh }) {
    const navigate = useNavigate();
    const { clearUnreadFor } = useRealtime();

    if (!notifications?.length) return (
        <div className="unreadEmpty">
            <p>No tienes mensajes nuevos sin leer.</p>
        </div>
    );

    const handleClick = async (n) => {
        const { notificacion } = n;
        if (!notificacion) return;

        try {
            // 1. Marcar como leído en DB
            await notifApi.read(n.id, true);

            // 2. Acciones específicas por tipo
            if (notificacion.chat_canal_id) {
                // Es un chat: limpiar badges globales y navegar
                clearUnreadFor(notificacion.chat_canal_id);
                navigate(`/chat/c/${notificacion.chat_canal_id}`);
            } else if (notificacion.tarea_id) {
                // Es una tarea: abrir el modal en el dashboard
                onOpenTask(notificacion.tarea_id);
            } else if (notificacion.link_url) {
                // Link genérico
                navigate(notificacion.link_url);
            }

            // 3. Informar al dashboard para que refresque su lista
            onRefresh?.();
        } catch (e) {
            console.error("Error al procesar notificación:", e);
        }
    };

    return (
        <div className="unreadList">
            {notifications.map(n => (
                <div
                    key={n.id}
                    className="unreadItem"
                    onClick={() => handleClick(n)}
                >
                    <div className="unreadInfo">
                        <span className="unreadTitle">{n.notificacion?.titulo}</span>
                        <p className="unreadText" dangerouslySetInnerHTML={{ __html: n.notificacion?.mensaje }} />
                        <div className="unreadMeta">
                            <span className="unreadTime">{new Date(n.notificacion?.created_at).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
