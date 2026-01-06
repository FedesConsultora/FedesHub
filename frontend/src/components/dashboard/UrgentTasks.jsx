import React from 'react';
import './tasks.scss';

export default function UrgentTasks({ tasks, onOpenTask }) {
    if (!tasks?.length) return (
        <div className="urgentTasksEmpty">
            <p>No hay tareas urgentes pendientes. ¡Buen trabajo!</p>
        </div>
    );

    return (
        <div className="urgentList">
            {tasks.map(t => (
                <div
                    key={t.id}
                    className="urgentItem"
                    onClick={() => onOpenTask(t.id)}
                >
                    <div className="itemMain">
                        <span className="taskTitle">{t.titulo}</span>
                        <div className="itemMeta">
                            {t.cliente_nombre && (
                                <span
                                    className="clientBadge"
                                    style={{ backgroundColor: t.cliente_color || '#cbd5e1' }}
                                >
                                    {t.cliente_nombre}
                                </span>
                            )}
                            <span className="statusTag">{t.estado_nombre}</span>
                        </div>
                    </div>
                    <div className="itemSide">
                        {t.vencimiento && (
                            <span className="vencTag">
                                {new Date(t.vencimiento).toLocaleDateString()}
                            </span>
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
