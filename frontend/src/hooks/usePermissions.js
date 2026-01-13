// /frontend/src/hooks/usePermissions.js
import { useAuthCtx } from '../context/AuthContext'
const IS_DEV = import.meta.env.DEV

export default function usePermission() {
  const ctx = useAuthCtx()
  const safeHasPerm = ctx?.hasPerm ?? (() => true)

  const can = (modulo, accion) => {
    return safeHasPerm(modulo, accion)
  }

  return { can, perms: ctx?.perms || [] }
}