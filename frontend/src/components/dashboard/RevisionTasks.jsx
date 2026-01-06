import React from 'react';
import './tasks.scss';

export default function RevisionTasks({ tasks, onOpenTask }) {
    if (!tasks?.length) return (
        <div className="urgentTasksEmpty">
            <p>No hay tareas pendientes de revisión global.</p>
        </div>
    );

    return (
        <div className="urgentList">
            {tasks.map(t => (
                <div
                    key={t.id}
                    className="urgentItem revision"
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
                            <span className="authorName">Por: {t.autor_nombre} {t.autor_apellido}</span>
                        </div>
                    </div>
                    <div className="itemSide">
                        <button className="btnDetail">Revisar</button>
                    </div>
                </div>
            ))}
        </div>
    );
}
