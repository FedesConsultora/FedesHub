import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MetricsGrid from '../../components/dashboard/MetricsGrid'
import CreateTaskModal from '../../components/tasks/CreateTaskModal'
import ModalPanel from '../Tareas/components/ModalPanel'
import TaskDetail from '../Tareas/TaskDetail'
import UrgentTasks from '../../components/dashboard/UrgentTasks'
import RevisionTasks from '../../components/dashboard/RevisionTasks'
import OverdueTasks from '../../components/dashboard/OverdueTasks'
import DashboardUnread from '../../components/dashboard/DashboardUnread'
import DashboardBlock from '../../components/dashboard/DashboardBlock'
import { tareasApi } from '../../api/tareas'
import { notifApi } from '../../api/notificaciones'
import { useRealtime } from '../../realtime/RealtimeProvider'
import { FiTrash2 } from 'react-icons/fi'
import './Dashboard.scss'

const DEFAULT_LEFT_COL = ['metrics', 'overdue', 'urgent', 'revision']
const DEFAULT_RIGHT_COL = ['unread']

export default function Dashboard() {
  const navigate = useNavigate()
  const { clearAllChatUnreads } = useRealtime() || {}
  const [showCreate, setShowCreate] = useState(false)
  const [openTaskId, setOpenTaskId] = useState(null)
  const [openCommentId, setOpenCommentId] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [periodo, setPeriodo] = useState('semana')
  const [tipoTarea, setTipoTarea] = useState('TODAS')
  const [tipoOverdue, setTipoOverdue] = useState('TODAS') // New filter for overdue
  const [urgentTasks, setUrgentTasks] = useState([])
  const [overdueTasks, setOverdueTasks] = useState([]) // New state
  const [revisionTasks, setRevisionTasks] = useState([])
  const [unreadNotifs, setUnreadNotifs] = useState([])
  const [loading, setLoading] = useState(true)
  const [dragOverInfo, setDragOverInfo] = useState({ col: null, index: null })

  // Layout State (Multi-column)
  const [leftCol, setLeftCol] = useState(() => {
    const saved = localStorage.getItem('fh:dashboard:leftCol')
    const initial = saved ? JSON.parse(saved) : DEFAULT_LEFT_COL
    // Ensure 'overdue' is included in saved state if it's missing (migration)
    if (!initial.includes('overdue')) initial.splice(1, 0, 'overdue')
    return initial
  })
  const [rightCol, setRightCol] = useState(() => {
    const saved = localStorage.getItem('fh:dashboard:rightCol')
    const initial = saved ? JSON.parse(saved) : DEFAULT_RIGHT_COL
    return initial
  })
  const [collapsedBlocks, setCollapsedBlocks] = useState(() => {
    const saved = localStorage.getItem('fh:dashboard:collapsed')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem('fh:dashboard:leftCol', JSON.stringify(leftCol))
    localStorage.setItem('fh:dashboard:rightCol', JSON.stringify(rightCol))
  }, [leftCol, rightCol])

  useEffect(() => {
    localStorage.setItem('fh:dashboard:collapsed', JSON.stringify(collapsedBlocks))
  }, [collapsedBlocks])

  const fetchData = async (p = periodo, t = tipoTarea, to = tipoOverdue) => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const [m, u, n, o] = await Promise.all([
        tareasApi.getMetrics({ periodo: p, tipo: t }),
        tareasApi.getUrgent(),
        notifApi.inbox({ only_unread: true, limit: 10 }),
        tareasApi.list({
          vencimiento_to: today,
          include_finalizadas: false,
          tipo: to === 'TODAS' ? undefined : to,
          limit: 10
        })
      ])

      setMetrics(m)
      setUrgentTasks(u)
      setUnreadNotifs(n.rows || n)
      // Filter out tasks that are exactly today if requested, but backend vencimiento_to is inclusive usually.
      // We'll trust the API list for overdue (vencimiento_to: today).
      // Actually strictly overdue means < today.
      const strictlyOverdue = (o.rows || o).filter(task => {
        if (!task.vencimiento) return false;
        return task.vencimiento < today;
      });
      setOverdueTasks(strictlyOverdue)

      if (m.is_directivo) {
        const rev = await tareasApi.list({ estado_codigo: 'revision' })
        setRevisionTasks(rev.rows || rev)
      }
    } catch (e) {
      console.error('Error fetching dashboard data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const handlePush = (ev) => {
      const type = ev?.detail?.type || ''
      if (type.includes('tarea') || type.includes('notif') || type.includes('chat')) {
        fetchData()
      }
    }
    window.addEventListener('fh:push', handlePush)
    return () => window.removeEventListener('fh:push', handlePush)
  }, [])

  const handlePeriodChange = (newP) => {
    setPeriodo(newP)
    fetchData(newP, tipoTarea, tipoOverdue)
  }

  const handleTipoChange = (newT) => {
    setTipoTarea(newT)
    fetchData(periodo, newT, tipoOverdue)
  }

  const handleTipoOverdueChange = (newT) => {
    setTipoOverdue(newT)
    fetchData(periodo, tipoTarea, newT)
  }

  const toggleCollapse = (id) => {
    setCollapsedBlocks(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    )
  }

  const handleOpenTask = (id, commentId = null) => {
    setOpenTaskId(id)
    setOpenCommentId(commentId)
  }

  const handleClearNotifs = async () => {
    try {
      await notifApi.clearAll(null, 'read')
      fetchData()
      clearAllChatUnreads?.()
      window.dispatchEvent(new Event('fh:notif:changed'))
    } catch (err) {
      console.error('Error clearing dashboard notifs:', err)
    }
  }

  // Drag & Drop
  const handleDragStart = (e, id, sourceCol) => {
    e.dataTransfer.setData('blockId', id)
    e.dataTransfer.setData('sourceCol', sourceCol)
  }

  const handleDragOver = (e, col, index = null) => {
    e.preventDefault()
    setDragOverInfo({ col, index })
  }

  const handleDragLeave = (e) => {
    if (e.relatedTarget === null || !e.currentTarget.contains(e.relatedTarget)) {
      setDragOverInfo({ col: null, index: null })
    }
  }

  const handleDrop = (e, targetId, targetCol, targetIndex = null) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverInfo({ col: null, index: null })

    const draggedId = e.dataTransfer.getData('blockId')
    const sourceCol = e.dataTransfer.getData('sourceCol')

    if (!draggedId) return
    if (draggedId === targetId && sourceCol === targetCol) return

    let newLeft = [...leftCol]
    let newRight = [...rightCol]

    if (sourceCol === 'left') newLeft = newLeft.filter(id => id !== draggedId)
    else newRight = newRight.filter(id => id !== draggedId)

    const targetArr = targetCol === 'left' ? newLeft : newRight
    let finalIdx = targetIndex
    if (finalIdx === null) {
      finalIdx = targetId ? targetArr.indexOf(targetId) : targetArr.length
    }

    const cleanTargetArr = targetArr.filter(id => id !== draggedId)
    cleanTargetArr.splice(finalIdx, 0, draggedId)

    if (targetCol === 'left') {
      setLeftCol(cleanTargetArr)
      if (sourceCol === 'right') setRightCol(newRight)
    } else {
      setRightCol(cleanTargetArr)
      if (sourceCol === 'left') setLeftCol(newLeft)
    }
  }

  const renderBlock = (id, col, index) => {
    const isCollapsed = collapsedBlocks.includes(id)

    const blockProps = {
      id,
      isCollapsed,
      onToggle: toggleCollapse,
      onDragStart: (e) => handleDragStart(e, id, col),
      onDragOver: (e) => handleDragOver(e, col, index),
      onDrop: (e) => handleDrop(e, id, col, index),
    }

    switch (id) {
      case 'metrics':
        return (
          <DashboardBlock
            key={id}
            {...blockProps}
            title="Resumen"
            headerActions={
              <div className="miniTabs" >
                <button className={tipoTarea === 'TODAS' ? 'active' : ''} onClick={(e) => { e.stopPropagation(); handleTipoChange('TODAS') }}>Todas</button>
                <button className={tipoTarea === 'COM' ? 'active' : ''} onClick={(e) => { e.stopPropagation(); handleTipoChange('COM') }}>Comercial</button>
                <button className={tipoTarea === 'TC' ? 'active' : ''} onClick={(e) => { e.stopPropagation(); handleTipoChange('TC') }}>TC</button>
                <button className={tipoTarea === 'IT' ? 'active' : ''} onClick={(e) => { e.stopPropagation(); handleTipoChange('IT') }}>IT</button>
              </div>
            }
          >
            <MetricsGrid data={metrics} />
          </DashboardBlock>
        )
      case 'overdue':
        return (
          <DashboardBlock
            key={id}
            {...blockProps}
            title="⚠️ Tareas Vencidas"
            count={overdueTasks.length}
            headerActions={
              <div className="miniTabs" >
                <button className={tipoOverdue === 'TODAS' ? 'active' : ''} onClick={(e) => { e.stopPropagation(); handleTipoOverdueChange('TODAS') }}>Todas</button>
                <button className={tipoOverdue === 'COM' ? 'active' : ''} onClick={(e) => { e.stopPropagation(); handleTipoOverdueChange('COM') }}>Comercial</button>
                <button className={tipoOverdue === 'TC' ? 'active' : ''} onClick={(e) => { e.stopPropagation(); handleTipoOverdueChange('TC') }}>TC</button>
                <button className={tipoOverdue === 'IT' ? 'active' : ''} onClick={(e) => { e.stopPropagation(); handleTipoOverdueChange('IT') }}>IT</button>
              </div>
            }
          >
            <OverdueTasks tasks={overdueTasks} onOpenTask={(tid) => handleOpenTask(tid)} />
          </DashboardBlock>
        )
      case 'urgent':
        return (
          <DashboardBlock key={id} {...blockProps} title="🚀 Tareas más urgentes" count={urgentTasks.length}>
            <UrgentTasks tasks={urgentTasks} onOpenTask={(tid) => handleOpenTask(tid)} />
          </DashboardBlock>
        )
      case 'revision':
        if (!metrics?.is_directivo) return null
        return (
          <DashboardBlock key={id} {...blockProps} title="📋 Tareas en revisión" count={revisionTasks.length}>
            <RevisionTasks tasks={revisionTasks} onOpenTask={(tid) => handleOpenTask(tid)} />
          </DashboardBlock>
        )
      case 'unread':
        return (
          <DashboardBlock
            key={id}
            {...blockProps}
            title="💬 Mensajes sin leer"
            count={unreadNotifs.length}
            headerActions={
              unreadNotifs.length > 0 && (
                <button
                  className="clearNotifsBtn"
                  onClick={(e) => { e.stopPropagation(); handleClearNotifs(); }}
                  title="Marcar todos como leídos"
                >
                  <FiTrash2 />
                </button>
              )
            }
          >
            <DashboardUnread notifications={unreadNotifs} onOpenTask={handleOpenTask} onRefresh={() => fetchData()} />
          </DashboardBlock>
        )
      default:
        return null
    }
  }

  const renderColContent = (ids, colName) => {
    const content = []
    ids.forEach((id, idx) => {
      if (dragOverInfo.col === colName && dragOverInfo.index === idx) {
        content.push(<div key={`placeholder-${colName}-${idx}`} className="dropPlaceholder" />)
      }
      content.push(renderBlock(id, colName, idx))
    })
    if (dragOverInfo.col === colName && dragOverInfo.index === ids.length) {
      content.push(<div key={`placeholder-${colName}-last`} className="dropPlaceholder" />)
    }
    return content
  }

  document.title = 'FedesHub — Inicio'

  return (
    <div className="dashboardWrap">
      <div className="dashHeader">
        <div className="headerLeft">
          <h1>Hola, {metrics?.user_nombre || 'Bienvenido'}</h1>
          <p>Este es el resumen de tu actividad para hoy.</p>
        </div>
        <div className="headerRight">
          <button className="btnCreate" onClick={() => navigate('/tareas')}>Ver Tareas</button>
        </div>
      </div>

      <div className="dashContentGrid" onDragLeave={handleDragLeave}>
        <div
          className="dashMainCol"
          onDragOver={(e) => handleDragOver(e, 'left', leftCol.length)}
          onDrop={(e) => handleDrop(e, null, 'left', leftCol.length)}
        >
          {renderColContent(leftCol, 'left')}
        </div>
        <div
          className="dashSideCol"
          onDragOver={(e) => handleDragOver(e, 'right', rightCol.length)}
          onDrop={(e) => handleDrop(e, null, 'right', rightCol.length)}
        >
          {renderColContent(rightCol, 'right')}
        </div>
      </div>

      {showCreate && <CreateTaskModal onClose={() => setShowCreate(false)} onCreated={() => fetchData()} />}
      {openTaskId && (
        <ModalPanel open={!!openTaskId} onClose={() => { setOpenTaskId(null); setOpenCommentId(null); }}>
          <TaskDetail
            taskId={openTaskId}
            initialCommentId={openCommentId}
            onUpdated={() => fetchData()}
            onClose={() => { setOpenTaskId(null); setOpenCommentId(null); }}
          />
        </ModalPanel>
      )}
    </div>
  )
}
