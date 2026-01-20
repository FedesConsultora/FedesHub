import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiX, FiArrowUp, FiPlus, FiExternalLink } from 'react-icons/fi'
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
 * Modal para navegar entre tareas de una familia (padre, hermanas, hijas)
 * Con vista estilo Kanban y drag & drop para reorganizar jerarquía
 */
export default function TaskFamilyModal({ taskId, onClose, onNavigate, onNewSubtask, currentTask }) {
    const navigate = useNavigate()
    const toast = useToast()
    const { parentTask, siblings, children, loading, error, reload } = useTaskFamily(taskId)
    const [draggedTask, setDraggedTask] = useState(null)
    const [dragOverZone, setDragOverZone] = useState(null)

    // Scroll lock
    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = '' }
    }, [])

    // Escape to close
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    const handleNavigate = (id) => {
        if (onNavigate) {
            onNavigate(id)
        } else {
            navigate(`/tareas/${id}`)
            onClose?.()
        }
    }


    const handleDragStart = (e, task, zone) => {
        setDraggedTask({ ...task, fromZone: zone })
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', task.id.toString())

        // Visual feedback for ghost image
        const target = e.currentTarget
        target.style.opacity = '0.5'
        setTimeout(() => { target.style.opacity = '1' }, 0)
    }

    const handleDragOver = (e, zone) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDragOverZone(zone)
    }

    const handleDragLeave = () => {
        setDragOverZone(null)
    }

    const handleDrop = async (e, targetZone) => {
        e.preventDefault()
        setDragOverZone(null)

        if (!draggedTask) {
            setDraggedTask(null)
            return
        }

        // Si se suelta en la misma zona, no hacemos nada
        if (draggedTask.fromZone === targetZone) {
            setDraggedTask(null)
            return
        }

        try {
            let newParentId = undefined

            // Lógica de jerarquía:
            if (targetZone === 'parent') {
                // Subir nivel: El padre del padre actual se convierte en el nuevo padre
                newParentId = parentTask?.tarea_padre_id || null
            } else if (targetZone === 'siblings') {
                // Nivel Actual: El padre de la tarea actual se convierte en el nuevo padre
                newParentId = currentTask?.tarea_padre_id || null
            } else if (targetZone === 'children') {
                // Bajar nivel: La tarea actual se convierte en el nuevo padre
                newParentId = taskId
            }

            if (newParentId !== undefined) {
                // Actualizar la tarea
                await tareasApi.update(draggedTask.id, { tarea_padre_id: newParentId })
                toast?.success('Jerarquía actualizada')
                reload()
            }
        } catch (e) {
            toast?.error(e?.message || 'No se pudo actualizar la jerarquía')
        } finally {
            setDraggedTask(null)
            setDragOverZone(null)
        }
    }

    const handleOverlayClick = (e) => {
        if (e.target.classList.contains('taskFamilyModalWrap') || e.target.classList.contains('familyCardScroll')) {
            onClose?.()
        }
    }

    const TaskKanbanCard = ({ task, zone, isCurrent = false }) => {
        const dueTxt = task?.vencimiento
            ? new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit' })
                .format(new Date(task.vencimiento))
            : '—'

        const prio = getPriorityMeta(
            task?.prioridad_num || task?.prioridad || 0,
            task?.boost_manual || 0,
            task?.vencimiento
        )
        const prioClass = prio.level >= 3 ? 'prio-crit' : prio.level === 2 ? 'prio-high' : prio.level === 1 ? 'prio-med' : 'prio-low'

        const boltIcon = prio.isBoosted && (
            <div className="fh-k-prio-bolt" title="Prioridad manual activada">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#ffeb3b" style={{ filter: 'drop-shadow(0 0 4px rgba(255,235,59,0.8))' }}>
                    <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z" />
                </svg>
            </div>
        )

        const statusCode = task?.estado?.codigo || task?.estado_codigo || 'pendiente'
        const statusName = task?.estado?.nombre || task?.estado_nombre || '—'
        const statusColor = STATUS_COLORS[statusCode] || '#94a3b8'

        const clienteNombre = task?.cliente?.nombre || task?.cliente_nombre || '—'
        const responsables = task?.Responsables || task?.responsables || []
        const colaboradores = task?.Colaboradores || task?.colaboradores || []

        return (
            <article
                className={`fh-k-task ${prioClass} ${task?.vencida ? 'is-vencida' : ''} ${isCurrent ? 'is-current' : ''}`}
                draggable={!isCurrent}
                onDragStart={(e) => !isCurrent && handleDragStart(e, task, zone)}
                onClick={() => !isCurrent && handleNavigate(task.id)}
                role="button"
                tabIndex={0}
            >
                <div className="fh-k-row">
                    <div className="fh-k-client" title={clienteNombre}>
                        {clienteNombre}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div
                            className="fh-k-status-badge"
                            style={{
                                fontSize: '0.65rem',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                backgroundColor: `${statusColor}15`,
                                color: statusColor,
                                border: `1px solid ${statusColor}30`,
                                fontWeight: '800',
                                textTransform: 'uppercase',
                                letterSpacing: '0.3px',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {statusName}
                        </div>
                        {task?.vencida && (
                            <div
                                className="fh-k-status-badge"
                                style={{
                                    fontSize: '0.65rem',
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    backgroundColor: `#9F1B1B15`,
                                    color: '#9F1B1B',
                                    border: `1px solid #9F1B1B30`,
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.3px',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                Vencida
                            </div>
                        )}
                        <div className="fh-k-date" title="Vencimiento">{dueTxt}</div>
                        {boltIcon}
                    </div>
                </div>

                <div className="fh-k-title" title={task?.titulo}>{task?.titulo}</div>

                <div className="fh-k-people">
                    <div className="fh-k-role">
                        <span className="fh-k-roleLabel">Resp.</span>
                        <AvatarStack
                            people={responsables}
                            titlePrefix="Responsable: "
                        />
                    </div>
                    <div className="fh-k-role">
                        <span className="fh-k-roleLabel">Colab.</span>
                        <AvatarStack
                            people={colaboradores}
                            titlePrefix="Colaborador: "
                        />
                    </div>
                </div>

                {isCurrent && (
                    <div className="current-badge">Tarea actual</div>
                )}
            </article>
        )
    }

    const modalContent = (
        <div className="taskFamilyModalWrap" role="dialog" aria-modal="true" onClick={handleOverlayClick}>
            <div className="familyCard" onClick={(e) => e.stopPropagation()}>
                <header className="familyHeader">
                    <div className="brand">
                        <div className="logo">Familia de Tareas</div>
                        <div className="subtitle">Arrastrá las tarjetas para reorganizar la jerarquía</div>
                    </div>
                    <button type="button" className="close" onClick={onClose} aria-label="Cerrar">
                        <FiX />
                    </button>
                </header>

                <div className="familyBody">
                    {loading && (
                        <div style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <GlobalLoader isLoading={true} size={80} />
                        </div>
                    )}

                    {error && (
                        <div className="error-message">{error}</div>
                    )}

                    {!loading && !error && (
                        <div className="hierarchy-container">

                            {/* NIVEL 1: SUPERIOR / PADRE */}
                            <div
                                className={`hierarchy-level level-parent ${dragOverZone === 'parent' ? 'drag-over' : ''}`}
                                onDragOver={(e) => handleDragOver(e, 'parent')}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, 'parent')}
                            >
                                <div className="level-header">
                                    <div className="level-info">
                                        <span className="level-badge">Nivel 1</span>
                                        <h3>Superior</h3>
                                        <button
                                            className="btn-create-subtask"
                                            onClick={() => onNewSubtask(parentTask?.tarea_padre_id || null)}
                                            title="Nueva tarea en este nivel"
                                        >
                                            <FiPlus /> Nueva Subtarea
                                        </button>
                                    </div>
                                    <FiArrowUp className="level-icon" />
                                </div>
                                <div className="level-content">
                                    {parentTask ? (
                                        <div className="tasks-grid single-col">
                                            <TaskKanbanCard task={parentTask} zone="parent" />
                                        </div>
                                    ) : (
                                        <div className="empty-level">Esta tarea no tiene padre</div>
                                    )}
                                </div>
                            </div>

                            <div className="hierarchy-connector">
                                <div className="line"></div>
                                <FiArrowUp className="arrow" />
                            </div>

                            {/* NIVEL 2: ACTUAL / HERMANAS */}
                            <div
                                className={`hierarchy-level level-current ${dragOverZone === 'siblings' ? 'drag-over' : ''}`}
                                onDragOver={(e) => handleDragOver(e, 'siblings')}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, 'siblings')}
                            >
                                <div className="level-header">
                                    <div className="level-info">
                                        <span className="level-badge active">Nivel 2</span>
                                        <h3>Nivel Actual / Hermanas</h3>
                                        <button
                                            className="btn-create-subtask"
                                            onClick={() => onNewSubtask(currentTask?.tarea_padre_id || null)}
                                            title="Nueva tarea en este nivel"
                                        >
                                            <FiPlus /> Nueva Subtarea
                                        </button>
                                    </div>
                                </div>
                                <div className="level-content">
                                    <div className="tasks-grid">
                                        <TaskKanbanCard task={currentTask} zone="siblings" isCurrent={true} />
                                        {siblings.filter(s => s.id !== taskId).map(s => (
                                            <TaskKanbanCard key={s.id} task={s} zone="siblings" />
                                        ))}
                                    </div>
                                    {siblings.length === 0 && <div className="empty-level">Sin otras tareas en este nivel</div>}
                                </div>
                            </div>

                            <div className="hierarchy-connector">
                                <div className="line"></div>
                                <FiArrowUp className="arrow" />
                            </div>

                            {/* NIVEL 3: HIJAS / SUBTAREAS */}
                            <div
                                className={`hierarchy-level level-children ${dragOverZone === 'children' ? 'drag-over' : ''}`}
                                onDragOver={(e) => handleDragOver(e, 'children')}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, 'children')}
                            >
                                <div className="level-header">
                                    <div className="level-info">
                                        <span className="level-badge">Nivel 3</span>
                                        <h3>Subtareas</h3>
                                        <button
                                            className="btn-create-subtask"
                                            onClick={() => onNewSubtask(taskId)}
                                            title="Nueva tarea en este nivel"
                                        >
                                            <FiPlus /> Nueva Subtarea
                                        </button>
                                    </div>
                                </div>
                                <div className="level-content">
                                    {children.length > 0 ? (
                                        <div className="tasks-grid">
                                            {children.map(c => (
                                                <TaskKanbanCard key={c.id} task={c} zone="children" />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="empty-level">No hay subtareas aún</div>
                                    )}
                                </div>
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    )

    return createPortal(modalContent, document.body)
}
