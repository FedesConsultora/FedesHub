import React from 'react'
import { FiMinimize2, FiMaximize2, FiMove } from 'react-icons/fi'

export default function DashboardBlock({
    id,
    title,
    count,
    isCollapsed,
    onToggle,
    onDragStart,
    onDragOver,
    onDrop,
    children
}) {
    const [canDrag, setCanDrag] = React.useState(false);

    const handleDragStart = (e) => {
        if (!canDrag) {
            e.preventDefault();
            return;
        }
        onDragStart?.(e, id);
    };

    return (
        <div
            className={`dashboardBlock card ${isCollapsed ? 'collapsed' : ''}`}
            draggable={canDrag}
            onDragStart={handleDragStart}
            onDragEnd={() => setCanDrag(false)}
            onDragOver={(e) => onDragOver(e)}
            onDrop={(e) => onDrop(e, id)}
        >
            <div
                className="blockHeader"
                onMouseDown={(e) => {
                    // Solo activamos drag si no es un botón y es clic principal
                    if (e.button === 0 && !e.target.closest('button')) {
                        setCanDrag(true);
                    }
                }}
                onMouseLeave={() => {
                    // Si el ratón sale pero no estamos arrastrando, lo apagamos
                    setCanDrag(false);
                }}
            >
                <div className="headerLeft">
                    <FiMove className="dragHandle" />
                    <h3>{title}</h3>
                    {count !== undefined && <span className="countBadge">{count}</span>}
                </div>
                <div className="headerRight">
                    <button
                        className="toggleBtn"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onToggle(id);
                        }}
                    >
                        {isCollapsed ? <FiMaximize2 /> : <FiMinimize2 />}
                    </button>
                </div>
            </div>
            {!isCollapsed && (
                <div className="blockContent">
                    {children}
                </div>
            )}
        </div>
    )
}
