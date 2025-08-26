import { useAuthCtx } from '../../context/AuthContext.jsx'
export default function RequirePerm({ modulo, accion, children }) {
  const { hasPerm } = useAuthCtx()
  if (!hasPerm(modulo, accion)) {
    return <div style={{ padding: 24 }}>No tenés permiso para ver esta sección.</div>
  }
  return children
}
