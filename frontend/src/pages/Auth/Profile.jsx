import { useState } from 'react'
import { useAuthCtx } from '../../context/AuthContext'
import FormRow from '../../components/ui/FormRow'
import './Auth.scss'

export default function Profile() {
  const { user, changePassword } = useAuthCtx()
  const [old_password, setOld] = useState('')
  const [new_password, setNew] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  const onSubmit = async (e) => {
    e.preventDefault()
    setErr(null); setMsg(null)
    try {
      setLoading(true)
      await changePassword({ old_password, new_password })
      setMsg('Contraseña actualizada')
      setOld(''); setNew('')
    } catch (e) {
      setErr(e?.fh?.message || 'No se pudo cambiar la contraseña')
    } finally { setLoading(false) }
  }

  return (
    <section className="card">
      <h2>Mi perfil</h2>
      <div className="muted">Usuario: <b>{user?.email}</b></div>

      <form onSubmit={onSubmit} className="mt16">
        <FormRow label="Contraseña actual"><input type="password" value={old_password} onChange={e=>setOld(e.target.value)} required /></FormRow>
        <FormRow label="Nueva contraseña"><input type="password" value={new_password} onChange={e=>setNew(e.target.value)} required /></FormRow>

        {err && <div className="error">{err}</div>}
        {msg && <div className="ok">{msg}</div>}
        <button disabled={loading} className="primary">{loading ? 'Guardando…' : 'Guardar cambios'}</button>
      </form>
    </section>
  )
}
