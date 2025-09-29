import { useState } from 'react'
import TaskSummary from '../../components/dashboard/TaskSummary'
import MetricsGrid from '../../components/dashboard/MetricsGrid'
import CreateTaskModal from '../../components/tasks/CreateTaskModal'
import './Dashboard.scss'

export default function Dashboard() {
  const [showCreate, setShowCreate] = useState(false)
  document.title = 'FedesHub — Inicio'

  return (
    <div className="dashboardWrap">
      <div className="dashCols">
        <TaskSummary onCreate={() => setShowCreate(true)} />
        <MetricsGrid />
      </div>

      {showCreate && (
        <CreateTaskModal
          onClose={() => setShowCreate(false)}
          onCreated={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}
