import React from 'react';
import { useNavigate } from 'react-router-dom';
import { notifApi } from '../../api/notificaciones';
import { useRealtime } from '../../realtime/RealtimeProvider';
import { FiMessageSquare } from 'react-icons/fi';
import { linkify, escapeHtml } from '../../utils/security';
import './tasks.scss';

export default function DashboardUnread({ notifications, onOpenTask, onRefresh }) {
    const navigate = useNavigate();
    const { clearUnreadFor } = useRealtime();

    if (!notifications?.length) return (
        <div className="fh-empty-state" style={{ padding: '32px 16px' }}>
            <div className="icon"><FiMessageSquare /></div>
            <p>Bandeja limpia</p>
            <span>No tienes mensajes nuevos sin leer por ahora.</span>
        </div>
    );

    const handleClick = async (n) => {
        const { notificacion } = n;
        if (!notificacion) return;

        // 1. Marcar como leído en DB (Independiente de la navegación para ser robustos)
        // Usamos notificacion.id (el ID real de la notificación) en lugar de n.id (el ID del destino)
        // porque el backend setRead espera el notificacion_id.
        const notifId = notificacion.id || n.notificacion_id;
        if (notifId) {
            notifApi.read(notifId, true).catch(err => {
                console.error("Error marking notification as read:", err);
            });
        }

        // 2. Navegar inmediatamente
        const canalId = notificacion.chat_canal_id || notificacion.chatCanal?.id || notificacion.canal_id;

        if (canalId) {
            // Es un chat: limpiar badges globales y navegar
            clearUnreadFor(canalId);
            navigate(`/chat/c/${canalId}`);
        } else if (notificacion.tarea_id) {
            // Es una tarea: abrir el modal en el dashboard
            let commentId = null;
            if (notificacion.tipo?.codigo === 'tarea_comentario') {
                // Tentar extraer el ID del comentario si viene en data_json
                try {
                    const data = typeof notificacion.data_json === 'string'
                        ? JSON.parse(notificacion.data_json)
                        : notificacion.data_json;
                    commentId = data?.comentario_id || data?.comment_id;
                } catch (e) {
                    console.warn("No se pudo parsear metadata para comentario", e);
                }
            }
            onOpenTask(notificacion.tarea_id, commentId);
        } else if (notificacion.link_url) {
            // Link genérico - Convertir a relativo si es del mismo origen para SPA
            let url = notificacion.link_url;
            try {
                if (url.startsWith('http')) {
                    const parsed = new URL(url);
                    if (parsed.origin === window.location.origin) {
                        url = parsed.pathname + parsed.search + parsed.hash;
                    }
                }
            } catch (e) { }
            navigate(url);
        }

        // 3. Informar al dashboard para que refresque su lista
        onRefresh?.();
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
                        <p className="unreadText" dangerouslySetInnerHTML={{ __html: linkify(escapeHtml(n.notificacion?.mensaje)) }} />
                        <div className="unreadMeta">
                            <span className="unreadTime">{new Date(n.notificacion?.created_at).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
