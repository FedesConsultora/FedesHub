import { useEffect, useMemo, useState } from 'react'
import Modal from '../../../components/ui/Modal'
import FormRow from '../../../components/ui/FormRow'
import * as A from '../../../api/auth'
import * as F from '../../../api/feders'
import { useToast } from '../../../components/toast/ToastProvider'

export default function UserCreateModal({ open, onClose, onCreated, rolesCatalog }) {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [is_activo, setActivo] = useState(true)
  const [roles, setRoles] = useState([])        // ids

  // Feder linking
  const [linkMode, setLinkMode] = useState('none') // none | attach | create
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [pickedFeder, setPickedFeder] = useState(null)

  const [fedEstados, setFedEstados] = useState([])
  const [fedNew, setFedNew] = useState({ nombre: '', apellido: '', estado_id: null })

  const toggleRole = (id) => setRoles(list => list.includes(id) ? list.filter(x => x !== id) : [...list, id])

  useEffect(() => {
    if (!open) {
      setEmail(''); setPassword(''); setActivo(true); setRoles([]); setLinkMode('none')
      setResults([]); setQuery(''); setPickedFeder(null); setFedNew({ nombre: '', apellido: '', estado_id: null })
    }
  }, [open])

  useEffect(() => {
    if (open && linkMode === 'create') {
      F.listEstadosFeder().then(({ data }) => setFedEstados(data || [])).catch(() => { })
    }
  }, [open, linkMode])

  const doSearch = async () => {
    if (!query.trim()) { setResults([]); return }
    try {
      const { data } = await F.searchFeders(query.trim(), { limit: 10 })
      setResults((data?.rows) || [])
    } catch (e) {
      setResults([])
      toast?.error('No se pudo buscar Feders (¿permisos?)')
    }
  }

  const createUser = async () => {
    const body = { email: email.trim().toLowerCase(), password, roles, is_activo }
    if (!/@fedesconsultora\.com$/i.test(body.email)) { toast?.warn('Sólo emails @fedesconsultora.com'); return }
    if (password.length < 10) { toast?.warn('La contraseña debe tener al menos 10 caracteres'); return }

    try {
      const { data } = await A.adminCreateUser(body)
      toast?.success('Usuario creado')
      // Opcional: vincular/crear Feder
      try {
        if (linkMode === 'attach' && pickedFeder?.id) {
          await F.patchFeder(pickedFeder.id, { user_id: data.user.id })
          toast?.success('Feder vinculado')
        } else if (linkMode === 'create') {
          if (!fedNew.nombre?.trim() || !fedNew.apellido?.trim() || !fedNew.estado_id) {
            toast?.warn('Completá nombre, apellido y estado del Feder')
          } else {
            await F.createFeder({
              user_id: data.user.id,
              estado_id: fedNew.estado_id,
              nombre: fedNew.nombre.trim(),
              apellido: fedNew.apellido.trim(),
              is_activo: true
            })
            toast?.success('Feder creado y vinculado')
          }
        }
      } catch (e) {
        toast?.error(e?.fh?.message || 'No se pudo vincular/crear Feder')
      }
      onCreated?.(); onClose?.()
    } catch (e) {
      toast?.error(e?.fh?.message || 'No se pudo crear el usuario')
    }
  }

  return (
    <Modal open={open} title="Nuevo usuario" onClose={onClose} footer={
      <>
        <button onClick={onClose}>Cancelar</button>
        <button className="primary" onClick={createUser}>Crear</button>
      </>
    }>
      <FormRow label="Email">
        <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@fedesconsultora.com" />
      </FormRow>
      <FormRow label="Contraseña">
        <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••" />
      </FormRow>
      <FormRow label="Activo">
        <select value={String(is_activo)} onChange={e => setActivo(e.target.value === 'true')}>
          <option value="true">Sí</option><option value="false">No</option>
        </select>
      </FormRow>

      <div className="lbl" style={{ marginTop: 8, fontWeight: 700 }}>Roles</div>
      <div className="chipset">
        {(rolesCatalog || []).map(r => (
          <button key={r.id}
            className={roles.includes(r.id) ? 'chip active' : 'chip'}
            onClick={() => toggleRole(r.id)} title={r.descripcion || r.nombre}
          >{r.nombre}</button>
        ))}
      </div>

      <hr style={{ opacity: .15, margin: '12px 0' }} />

      <div className="lbl">Vincular Feder (opcional)</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
        <label><input type="radio" name="lm" checked={linkMode === 'none'} onChange={() => setLinkMode('none')} /> Ninguno</label>
        <label><input type="radio" name="lm" checked={linkMode === 'attach'} onChange={() => setLinkMode('attach')} /> Vincular existente</label>
        <label><input type="radio" name="lm" checked={linkMode === 'create'} onChange={() => setLinkMode('create')} /> Crear nuevo</label>
      </div>

      {linkMode === 'attach' && (
        <>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="Buscar por nombre, apellido, tel o email" value={query} onChange={e => setQuery(e.target.value)} />
            <button onClick={doSearch}>Buscar</button>
          </div>
          <div style={{ marginTop: 8, maxHeight: 200, overflow: 'auto', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: 6 }}>
            {(results || []).map(r => (
              <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', cursor: 'pointer' }}>
                <input type="radio" name="pick" checked={pickedFeder?.id === r.id} onChange={() => setPickedFeder(r)} />
                <span>{r.apellido}, {r.nombre} {r.user_email ? ` · ${r.user_email}` : ''}</span>
              </label>
            ))}
            {!results?.length && <div className="success">Sin resultados</div>}
          </div>
        </>
      )}

      {linkMode === 'create' && (
        <>
          <div className="twoCols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <FormRow label="Nombre"><input value={fedNew.nombre} onChange={e => setFedNew(v => ({ ...v, nombre: e.target.value }))} /></FormRow>
            <FormRow label="Apellido"><input value={fedNew.apellido} onChange={e => setFedNew(v => ({ ...v, apellido: e.target.value }))} /></FormRow>
          </div>
          <FormRow label="Estado">
            <select value={fedNew.estado_id || ''} onChange={e => setFedNew(v => ({ ...v, estado_id: +e.target.value || null }))}>
              <option value="">Seleccionar…</option>
              {(fedEstados || []).map(x => <option key={x.id} value={x.id}>{x.nombre}</option>)}
            </select>
          </FormRow>
          <div className="hint" style={{ marginTop: 4 }}>Se creará el Feder y quedará vinculado al usuario.</div>
        </>
      )}
    </Modal>
  )
}
