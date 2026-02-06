import React from 'react';
import './tasks.scss';
import { FiClock } from 'react-icons/fi';

export default function OverdueTasks({ tasks, onOpenTask }) {
    if (!tasks?.length) return (
        <div className="urgentTasksEmpty overdueEmpty">
            <p>No hay tareas vencidas. ¡Todo al día! ✨</p>
        </div>
    );

    return (
        <div className="urgentList overdueList">
            {tasks.map(t => (
                <div
                    key={t.id}
                    className="urgentItem overdueSectionItem"
                    onClick={() => onOpenTask(t.id)}
                >
                    <div className="itemMain">
                        <div className="titleLine">
                            <span className="taskTitle">{t.titulo}</span>
                        </div>
                        <div className="itemMeta">
                            {t.cliente_nombre && (
                                <span
                                    className="clientBadge"
                                    style={{ backgroundColor: t.cliente_color || '#ef4444' }}
                                >
                                    {t.cliente_nombre}
                                </span>
                            )}
                            <span className="statusTag">{t.estado_nombre}</span>
                        </div>
                    </div>
                    <div className="itemSide">
                        {t.vencimiento && (
                            <div className="overdueVenc">
                                <FiClock className="overdueClock" />
                                <span className="vencTag overdue">
                                    {new Date(t.vencimiento).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                        {(() => {
                            const p = (t.prioridad_num || 0) + (t.boost_manual || 0);
                            if (p >= 500) return <span className="priorityTag urgent critical">Crítica</span>;
                            if (p >= 300) return <span className="priorityTag urgent">Alta</span>;
                            if (p >= 100) return <span className="priorityTag medium">Media</span>;
                            return <span className="priorityTag low">Baja</span>;
                        })()}
                    </div>
                </div>
            ))}
        </div>
    );
}
