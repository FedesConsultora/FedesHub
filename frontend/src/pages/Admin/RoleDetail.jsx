import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import * as A from '../../api/auth'
import './Admin.scss'

export default function RoleDetail() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [role, setRole] = useState(null) // {id,nombre,permisos:[{id,nombre, ...}]}
  const [perms, setPerms] = useState([]) // todos
  const [mods, setMods] = useState([])   // cat módulos
  const [acts, setActs] = useState([])   // cat acciones

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError(null)
      try {
        const [{ data: r }, { data: allPerms }, { data: m }, { data: a }] = await Promise.all([
          A.adminGetRole(id), A.adminListPermissions(), A.adminListModules(), A.adminListActions()
        ])
        setRole(r); setPerms(allPerms||[]); setMods(m||[]); setActs(a||[])
      } catch (e) {
        setError(e?.fh?.message || 'Error cargando rol')
      } finally { setLoading(false) }
    }
    load()
  }, [id])

  const selected = useMemo(() => new Set((role?.permisos||[]).map(p => p.id)), [role])
  const permBy = useMemo(() => { const map={}; for (const p of perms) map[p.nombre]=p; return map }, [perms])

  const toggle = (modCode, actCode) => {
    const key = `${modCode}.${actCode}`
    const p = permBy[key]; if (!p) return
    const isSel = selected.has(p.id)
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
          <FragmentRow key={m.codigo} mod={m} acts={acts} selected={selected} toggle={toggle} />
        ))}
      </div>
    </section>
  )
}

function FragmentRow({ mod, acts, selected, toggle }) {
  return (
    <>
      <div className="pgMod">{mod.codigo}</div>
      {acts.map(a => {
        const key = `${mod.codigo}.${a.codigo}`
        const isOn = selected.has?.(key) // no tenemos id → lo resuelve arriba
        // marcamos con clase si coincide por nombre en RoleDetail (se setea por id, acá solo UI)
        return (
          <button key={a.codigo}
            className={`pgCell ${isOn ? 'on' : ''}`}
            onClick={()=>toggle(mod.codigo, a.codigo)}
            title={key}
          />
        )
      })}
    </>
  )
}
