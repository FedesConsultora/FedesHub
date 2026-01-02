import { useState, useMemo, useEffect } from 'react'
import useTasksBoard from '../../hooks/useTasksBoard'
import TaskSummary from '../../components/dashboard/TaskSummary'
import MetricsGrid from '../../components/dashboard/MetricsGrid'
import CreateTaskModal from '../../components/tasks/CreateTaskModal'
import ModalPanel from '../Tareas/components/ModalPanel'
import TaskDetail from '../Tareas/TaskDetail'
import './Dashboard.scss'
import InboxColumn from '../../components/dashboard/InboxColumn'
import { tareasApi } from '../../api/tareas'

export default function Dashboard() {
  const [showCreate, setShowCreate] = useState(false)
  const [openTaskId, setOpenTaskId] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const { board } = useTasksBoard()

  useEffect(() => {
    tareasApi.getMetrics().then(setMetrics).catch(console.error)
  }, [])

  const inboxItems = useMemo(() => {
    return board.columns?.inbox || []
  }, [board])



  document.title = 'FedesHub — Inicio'

  return (

    <div className="dashboardWrap">
      <div className="dashTop">
        {/* Columna izquierda: Metrics + Kanban */}
        <div className="dashLeftCol">
          <div className='dashMetrics'>
            <MetricsGrid data={metrics} />
          </div>
          <div className="dashCols">
            <TaskSummary
              onCreate={() => setShowCreate(true)}
              onOpenTask={setOpenTaskId}
            />
          </div>
        </div>

        {/* Columna derecha: Bandeja de entrada */}
        <div className="dashInboxCol">
          <InboxColumn
            items={inboxItems}
            onOpenTask={setOpenTaskId}
          />
        </div>
      </div>

      {showCreate && (
        <CreateTaskModal
          onClose={() => setShowCreate(false)}
          onCreated={() => setShowCreate(false)}
        />
      )}

      {openTaskId && (
        <ModalPanel open={!!openTaskId} onClose={() => setOpenTaskId(null)}>
          <TaskDetail
            taskId={openTaskId}
            onUpdated={() => { }}
            onClose={() => setOpenTaskId(null)}
          />
        </ModalPanel>
      )}
    </div>

  )
}
