// /frontend/src/components/dashboard/MetricCard.jsx
import { memo } from 'react'
import './metrics.scss'

function MetricCard({ title, value, hint }) {
  return (
    <div className="metricCard">
      <div className="mcValue">{value}</div>
      <div className="mcTitle">{title}</div>
      {hint ? <div className="mcHint">{hint}</div> : null}
    </div>
  )
}
export default memo(MetricCard)
