import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiX, FiPlus, FiChevronDown, FiChevronRight } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import useTaskFamily from '../../pages/Tareas/hooks/useTaskFamily'
import GlobalLoader from '../loader/GlobalLoader'
import { useToast } from '../toast/ToastProvider'
import { tareasApi } from '../../api/tareas'
import AvatarStack from '../common/AvatarStack'
import { getPriorityMeta } from './priority-utils'
import './TaskFamilyModal.scss'

const STATUS_COLORS = {
    pendiente: '#7A1B9F',
    en_curso: '#9F1B50',
    revision: '#1B6D9F',
    aprobada: '#1B9F4E',
    cancelada: '#9F1B1B',
}

/**
 * Componente para cada tarjeta de tarea en el árbol
 */
const TaskKanbanCard = ({
    task,
    isCurrent = false,
    onNavigate,
    onNewSubtask,
    onDragStart,
    dragOverTaskId,
    onDragOver,
    onDragLeave,
    onDrop
}) => {
    const dueTxt = task?.vencimiento
        ? new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit' }).format(new Date(task.vencimiento))
        : '—'

    const prio = getPriorityMeta(task?.prioridad_num || 0, task?.boost_manual || 0, task?.vencimiento)
    const prioClass = prio.level >= 3 ? 'prio-crit' : prio.level === 2 ? 'prio-high' : prio.level === 1 ? 'prio-med' : 'prio-low'

    const statusCode = task?.estado_codigo || 'pendiente'
    const statusName = task?.estado_nombre || '—'
    const statusColor = STATUS_COLORS[statusCode] || '#94a3b8'

    const clienteNombre = task?.cliente_nombre || '—'
    const responsables = task?.responsables || []

    return (
        <article
            className={`fh-k-task compact ${prioClass} ${task?.vencida ? 'is-vencida' : ''} ${isCurrent ? 'is-current' : ''} ${dragOverTaskId === task.id ? 'drag-over' : ''}`}
            draggable={!isCurrent}
            onDragStart={(e) => !isCurrent && onDragStart(e, task)}
            onDragOver={(e) => !isCurrent && onDragOver(e, task.id)}
            onDragLeave={onDragLeave}
            onDrop={(e) => !isCurrent && onDrop(e, task.id)}
            onClick={() => !isCurrent && onNavigate(task.id)}
        >
            <div className="fh-k-row">
                <div className="fh-k-client">{clienteNombre}</div>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <div className="fh-k-status-badge" style={{ color: statusColor, borderColor: statusColor + '30', backgroundColor: statusColor + '15' }}>
                        {statusName}
                    </div>
                </div>
            </div>
            <div className="fh-k-title">{task?.titulo}</div>
            <div className="fh-k-people">
                <AvatarStack people={(responsables || []).map(r => r.feder || r)} titlePrefix="Resp: " />
                <div className="fh-k-date">{dueTxt}</div>
                {!task.isAncestor && (
                    <button
                        className="btn-create-subtask-icon active-plus"
                        onClick={(e) => {
                            e.stopPropagation();
                            onNewSubtask(task.id);
                        }}
                        title="Nueva subtarea"
                    >
                        <FiPlus />
                    </button>
                )}
            </div>
            {isCurrent && <div className="current-badge">Actual</div>}
        </article>
    )
}

/**
 * Nodo recursivo del árbol
 */
const TreeNode = ({ node, currentTaskId, ...props }) => {
    // Inicializar expandido si es ancestro o el actual por defecto
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    return (
        <div className={`tree-node ${node.isCurrent ? 'is-active-branch' : ''}`}>
            <div className="tree-node-content">
                {hasChildren && (
                    <button className="tree-toggle" onClick={() => setIsExpanded(!isExpanded)}>
                        {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                    </button>
                )}

                <TaskKanbanCard
                    task={node}
                    isCurrent={Number(node.id) === Number(currentTaskId)}
                    {...props}
                />
            </div>

            {hasChildren && isExpanded && (
                <div className="tree-children">
                    {node.children.map(child => (
                        <TreeNode key={child.id} node={child} currentTaskId={currentTaskId} {...props} />
                    ))}
                </div>
            )}
        </div>
    )
}

/**
 * Modal principal de Jerarquía
 */
export default function TaskFamilyModal({ taskId, onClose, onNavigate, onNewSubtask, currentTask }) {
    const navigate = useNavigate()
    const toast = useToast()
    const { levels: roots, loading, error, reload } = useTaskFamily(taskId)
    const [draggedTask, setDraggedTask] = useState(null)
    const [dragOverTaskId, setDragOverTaskId] = useState(null)

    useEffect(() => {
        document.body.style.overflow = 'hidden'
        const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
        window.addEventListener('keydown', onKey)
        return () => {
            document.body.style.overflow = ''
            window.removeEventListener('keydown', onKey)
        }
    }, [onClose])

    const handleNavigate = (id) => {
        if (onNavigate) {
            onNavigate(id)
        } else {
            navigate(`/tareas/${id}`)
            onClose?.()
        }
    }

    const handleDragStart = (e, task) => {
        setDraggedTask(task)
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', task.id.toString())
        e.currentTarget.style.opacity = '0.5'
        setTimeout(() => { if (e.currentTarget) e.currentTarget.style.opacity = '1' }, 0)
    }

    const handleDragOver = (e, targetTaskId) => {
        e.preventDefault()
        if (draggedTask && draggedTask.id !== targetTaskId) {
            setDragOverTaskId(targetTaskId)
        }
    }

    const handleDrop = async (e, targetParentId) => {
        e.preventDefault()
        setDragOverTaskId(null)
        if (!draggedTask || draggedTask.id === targetParentId) return

        try {
            await tareasApi.update(draggedTask.id, { tarea_padre_id: targetParentId })
            toast?.success('Jerarquía actualizada')
            reload()
        } catch (e) {
            toast?.error(e?.message || 'No se pudo actualizar la jerarquía')
        } finally {
            setDraggedTask(null)
        }
    }

    return createPortal(
        <div className="taskFamilyModalWrap" onClick={onClose}>
            <div className="familyCard" onClick={(e) => e.stopPropagation()}>
                <header className="familyHeader">
                    <div className="brand">
                        <div className="logo">Jerarquía de Tareas</div>
                        <div className="subtitle">Visualizando el árbol completo de relaciones</div>
                    </div>
                    <button className="close" onClick={onClose} aria-label="Cerrar"><FiX /></button>
                </header>

                <div className="familyBody tree-mode">
                    {loading ? (
                        <div className="loader-center"><GlobalLoader isLoading={true} size={80} /></div>
                    ) : error ? (
                        <div className="error-message">{error}</div>
                    ) : (
                        <div className="tree-container">
                            {roots.map(root => (
                                <TreeNode
                                    key={root.id}
                                    node={root}
                                    currentTaskId={taskId}
                                    onNavigate={handleNavigate}
                                    onNewSubtask={onNewSubtask}
                                    onDragStart={handleDragStart}
                                    dragOverTaskId={dragOverTaskId}
                                    onDragOver={handleDragOver}
                                    onDragLeave={() => setDragOverTaskId(null)}
                                    onDrop={handleDrop}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}
