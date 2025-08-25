import './AppGrid.scss'

export default function AppTile({ app, onClick, disabled }) {
  return (
    <button className={`appTile ${disabled ? 'isDisabled' : ''}`} onClick={onClick} title={app.name}>
      <div className="emoji">{app.emoji}</div>
      <div className="label">{app.name}</div>
      <div className="dragHint">⋮⋮</div>
    </button>
  )
}
