import './FedersHeader.scss'

export default function FedersHeader({ params, setParams, loading }) {
  return (
    <header className="fhFedersHeader">
      <div className="title"><h2>Feders</h2></div>
      <div className="filters">
        <label className="ctl">
          <span>Estado de Células</span>
          <select
            value={params.celulas_estado}
            onChange={(e)=>setParams(p=>({ ...p, celulas_estado:e.target.value }))}
            disabled={loading}
          >
            <option value="activa">Activas</option>
            <option value="pausada">Pausadas</option>
            <option value="cerrada">Cerradas</option>
          </select>
        </label>
      </div>
    </header>
  )
}
