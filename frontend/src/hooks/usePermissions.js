// /frontend/src/hooks/usePermissions.js
import { useAuthCtx } from '../context/AuthContext'
const IS_DEV = import.meta.env.DEV

export default function usePermission() {
  const ctx = useAuthCtx()
  const safeHasPerm = ctx?.hasPerm ?? (() => true)

  const can = (modulo, accion) => {
    if (IS_DEV && (modulo === 'calendario' || modulo === 'ausencias')) {
      return true
    }
    return safeHasPerm(modulo, accion)
  }

  return { can }
}