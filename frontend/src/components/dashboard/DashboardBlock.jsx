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
    return (
        <div
            className={`dashboardBlock card ${isCollapsed ? 'collapsed' : ''}`}
            draggable
            onDragStart={(e) => onDragStart(e, id)}
            onDragOver={(e) => onDragOver(e)}
            onDrop={(e) => onDrop(e, id)}
        >
            <div className="blockHeader">
                <div className="headerLeft">
                    <FiMove className="dragHandle" />
                    <h3>{title}</h3>
                    {count !== undefined && <span className="countBadge">{count}</span>}
                </div>
                <div className="headerRight">
                    <button className="toggleBtn" onClick={() => onToggle(id)}>
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
