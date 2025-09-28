import Modal from '../../../components/ui/Modal'
import FormRow from '../../../components/ui/FormRow'

export default function UserEditModal({ open, onClose, onSave, rolesCatalog, value }) {
  if (!open) return null
  const { email, is_activo, roles = [] } = value

  const toggle = (id) => {
    const has = value.roles.includes(id)
    const next = has ? value.roles.filter(x=>x!==id) : [...value.roles, id]
    onSave({ ...value, roles: next, _dirty: true }, { soft:true })
  }

  const setActivo = (b) => onSave({ ...value, is_activo: b, _dirty: true }, { soft:true })

  return (
    <Modal open={open} title={`Editar: ${email}`} onClose={onClose} footer={
      <>
        <button onClick={onClose}>Cancelar</button>
        <button className="primary" onClick={()=>onSave(value)}>Guardar</button>
      </>
    }>
      <FormRow label="Activo">
        <select value={String(is_activo)} onChange={e=>setActivo(e.target.value==='true')}>
          <option value="true">Sí</option><option value="false">No</option>
        </select>
      </FormRow>

      <div className="lbl" style={{marginTop:8, fontWeight:700}}>Roles</div>
      <div className="chipset">
        {(rolesCatalog||[]).map(r => (
          <button key={r.id}
            className={roles.includes(r.id) ? 'chip active' : 'chip'}
            onClick={()=>toggle(r.id)} title={r.descripcion || r.nombre}
          >{r.nombre}</button>
        ))}
      </div>
    </Modal>
  )
}
