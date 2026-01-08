import usePermission from '../../hooks/usePermissions'

export default function RequirePerm({ modulo, accion, children }) {
  const { can } = usePermission()

  if (!can(modulo, accion)) {
    return <div style={{ padding: 24 }}>No tenés permiso para ver esta sección.</div>
  }
  return children
}
