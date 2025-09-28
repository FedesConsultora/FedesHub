import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as A from '../../api/auth'
import './Admin.scss'
import { useToast } from '../../components/toast/ToastProvider.jsx'

export default function RoleDetail() {
  document.title = 'FedesHub — Permisos de rol'
  const { id } = useParams()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [role, setRole] = useState(null)
  const [perms, setPerms] = useState([])
  const [mods, setMods] = useState([])
  const [acts, setActs] = useState([])
  const [roleTypes, setRoleTypes] = useState([])

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError(null)
      try {
        const [
          { data: r }, { data: allPerms }, { data: m }, { data: a }, { data: rt }
        ] = await Promise.all([
          A.adminGetRole(id), A.adminListPermissions(), A.adminListModules(), A.adminListActions(), A.adminListRoleTypes()
        ])
        setRole(r); setPerms(allPerms||[]); setMods(m||[]); setActs(a||[]); setRoleTypes(rt||[])
      } catch (e) { setError(e?.fh?.message || 'Error cargando rol') }
      finally { setLoading(false) }
    }
    load()
  }, [id])

  const roleTypeCode = useMemo(() => {
    const t = roleTypes.find(t => t.id === role?.rol_tipo_id)
    return t?.codigo || null
  }, [role, roleTypes])
  const isSystem = roleTypeCode === 'system'

  const selectedById = useMemo(() => new Set((role?.permisos||[]).map(p => p.id)), [role])
  const permByKey = useMemo(() => { const o={}; for (const p of perms) o[`${p.modulo}.${p.accion}`]=p; return o }, [perms])

  const toggle = (m,a) => {
    if (isSystem) return
    const p = permByKey[`${m}.${a}`]; if (!p) return
    const isSel = selectedById.has(p.id)
    const next = isSel ? (role.permisos||[]).filter(x=>x.id!==p.id) : [...(role.permisos||[]), p]
    setRole(r => ({ ...r, permisos: next }))
  }

  const save = async () => {
    if (isSystem) return
    try {
      const ids = (role.permisos||[]).map(p=>p.id)
      await A.adminSetRolePermissions(role.id, ids)
      toast?.success('Permisos guardados')
    } catch(e){ toast?.error(e?.fh?.message || 'No se pudo guardar') }
  }

  if (loading) return <section className="card">Cargando…</section>
  if (error)   return <section className="card"><div className="error">{error}</div></section>
  if (!role)   return null

  return (
    <section style={{display:'flex', flexDirection:'column', minHeight:'60dvh'}}>
      <div className="sticky" style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 6px'}}>
        <div>
          <h2 style={{margin:0}}>Permisos del rol: {role.nombre}</h2>
          {isSystem && <div className="hint">Rol del sistema — permisos bloqueados</div>}
        </div>
        <div style={{display:'flex', gap:8}}>
          <Link to="/admin/roles"><button>← Volver</button></Link>
          <button className="primary" disabled={isSystem} onClick={save} title={isSystem?'Rol del sistema: no editable':''}>Guardar</button>
        </div>
      </div>

      {role.descripcion && <div className="success" style={{marginTop:8}}>{role.descripcion}</div>}

      <div className="permGrid" style={{ gridTemplateColumns: `160px repeat(${acts.length}, 96px)` }}>
        <div className="pgHead" />
        {acts.map(a => <div key={a.codigo} className="pgHead">{a.codigo}</div>)}
        {mods.map(m => <FragmentRow key={m.codigo} m={m} acts={acts} selectedById={selectedById} permByKey={permByKey} toggle={toggle} disabled={isSystem} />)}
      </div>
    </section>
  )
}

function FragmentRow({ m, acts, selectedById, permByKey, toggle, disabled }) {
  return (
    <>
      <div className="pgMod">{m.codigo}</div>
      {acts.map(a => {
        const p = permByKey[`${m.codigo}.${a.codigo}`]
        const on = !!(p && selectedById.has(p.id))
        const notDefined = !p
        return (
          <button
            key={a.codigo}
            onClick={()=>!notDefined && !disabled && toggle(m.codigo, a.codigo)}
            className={`pgCell ${on ? 'on': ''} ${notDefined ? 'disabled' : ''}`}
            title={notDefined ? 'No existe permiso definido' : `${m.codigo}.${a.codigo}`}
            disabled={notDefined || disabled}
          />
        )
      })}
    </>
  )
}