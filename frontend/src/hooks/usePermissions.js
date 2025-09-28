// /frontend/src/hooks/usePermissions.js
import { useAuthCtx } from '../context/AuthContext'
export default function usePermission() {
  const ctx = useAuthCtx()
  const safeHasPerm = ctx?.hasPerm ?? (() => true)    // fallback si por algún motivo no hay provider
  return { can: safeHasPerm }
}