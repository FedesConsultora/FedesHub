import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import * as A from '../../api/auth'
import './Admin.scss'

export default function RoleDetail() {
  document.title = 'FedesHub — Permisos de rol'
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [role, setRole] = useState(null)
  const [perms, setPerms] = useState([])
  const [mods, setMods] = useState([])
  const [acts, setActs] = useState([])

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError(null)
      try {
        const [{ data: r }, { data: allPerms }, { data: m }, { data: a }] = await Promise.all([
          A.adminGetRole(id), A.adminListPermissions(), A.adminListModules(), A.adminListActions()
        ])
        setRole(r); setPerms(allPerms||[]); setMods(m||[]); setActs(a||[])
      } catch (e) { setError(e?.fh?.message || 'Error cargando rol') }
      finally { setLoading(false) }
    }
    load()
  }, [id])

  const selectedById = useMemo(() => new Set((role?.permisos||[]).map(p => p.id)), [role])
  const permByKey = useMemo(() => { const o={}; for (const p of perms) o[`${p.modulo}.${p.accion}`]=p; return o }, [perms])

  const toggle = (m,a) => {
    const p = permByKey[`${m}.${a}`]; if (!p) return
    const isSel = selectedById.has(p.id)
    const next = isSel ? (role.permisos||[]).filter(x=>x.id!==p.id) : [...(role.permisos||[]), p]
    setRole(r => ({ ...r, permisos: next }))
  }

  const save = async () => {
    try {
      const ids = (role.permisos||[]).map(p=>p.id)
      await A.adminSetRolePermissions(role.id, ids)
      alert('Permisos guardados')
    } catch(e){ alert(e?.fh?.message || 'No se pudo guardar') }
  }

  if (loading) return <section className="card">Cargando…</section>
  if (error)   return <section className="card"><div className="error">{error}</div></section>
  if (!role)   return null

  return (
    <section className="card">
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <h2>Permisos del rol: {role.nombre}</h2>
        <button className="primary" onClick={save}>Guardar</button>
      </div>

      <div className="permGrid">
        <div className="pgHead" />
        {acts.map(a => <div key={a.codigo} className="pgHead">{a.codigo}</div>)}
        {mods.map(m => (
          <FragmentRow key={m.codigo} m={m} acts={acts} selectedById={selectedById} toggle={toggle} />
        ))}
      </div>
    </section>
  )
}

function FragmentRow({ m, acts, selectedById, toggle }) {
  return (
    <>
      <div className="pgMod">{m.codigo}</div>
      {acts.map(a => {
        const on = false; // (solo UI base; lo definimos por id en el padre)
        return (
          <button
            key={a.codigo}
            onClick={()=>toggle(m.codigo, a.codigo)}
            className={`pgCell ${on ? 'on': ''}`}
            title={`${m.codigo}.${a.codigo}`}
          />
        )
      })}
    </>
  )
}
