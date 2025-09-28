import { useEffect, useState } from 'react'
import * as A from '../../api/auth'
import './Admin.scss'
import './catalogos.page.scss'   // ⬅️ estilos específicos

export default function AdminCatalogos(){
  document.title = 'FedesHub — Catálogos'
  const [mods, setMods] = useState([])
  const [acts, setActs] = useState([])
  const [roleTypes, setRoleTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError(null)
      try {
        const [{ data: m }, { data: a }, { data: rt }] = await Promise.all([
          A.adminListModules(), A.adminListActions(), A.adminListRoleTypes()
        ])
        setMods(m||[]); setActs(a||[]); setRoleTypes(rt||[])
      } catch (e) { setError(e?.fh?.message || 'Error cargando catálogos') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  if (loading) return <section className="card adminCard">Cargando…</section>
  if (error)   return <section className="card adminCard"><div className="error">{error}</div></section>

  return (
    <section className="catalogos-page">
      <div className="card adminCard catalog-card">
        <header className="cardHead">
          <h3>Módulos</h3>
          <span className="meta">{mods.length} ítems</span>
        </header>
        <ul className="catalog-list">
          {mods.map(m => (
            <li key={m.id} className="catalog-chip" title={m.descripcion || ''}>
              <b className="code">{m.codigo}</b>
              <span className="name">{m.nombre}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card adminCard catalog-card">
        <header className="cardHead">
          <h3>Acciones</h3>
          <span className="meta">{acts.length} ítems</span>
        </header>
        <ul className="catalog-list">
          {acts.map(a => (
            <li key={a.id} className="catalog-chip" title={a.descripcion || ''}>
              <b className="code">{a.codigo}</b>
              <span className="name">{a.nombre}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card adminCard catalog-card">
        <header className="cardHead">
          <h3>Tipos de Rol</h3>
          <span className="meta">{roleTypes.length} ítems</span>
        </header>
        <ul className="catalog-list wide">
          {roleTypes.map(rt => (
            <li key={rt.id} className="catalog-chip" title={rt.descripcion || ''}>
              <b className="code">{rt.codigo}</b>
              <span className="name">{rt.nombre}</span>
            </li>
          ))}
        </ul>
        <div className="hint">
          Nota: los roles de tipo <b>system</b> no pueden editarse ni eliminarse y sus permisos no son modificables.
        </div>
      </div>
    </section>
  )
}