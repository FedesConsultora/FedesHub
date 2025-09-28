import crypto from 'crypto'
import { initModels } from '../../../models/registry.js'
const m = await initModels()

const ttlMinutes = Number(process.env.RESET_TTL_MIN || 30)

export const createPasswordResetToken = async (user_id) => {
  const token = crypto.randomBytes(32).toString('hex')
  const expires_at = new Date(Date.now() + ttlMinutes * 60 * 1000)
  await m.PasswordReset.create({ user_id, token, expires_at, used_at: null })
  return { token, expires_at }
}

export const usePasswordResetToken = async (token) => {
  const row = await m.PasswordReset.findOne({ where: { token } })
  if (!row) throw Object.assign(new Error('Token inválido'), { status: 400 })
  if (row.used_at) throw Object.assign(new Error('Token ya utilizado'), { status: 400 })
  if (new Date(row.expires_at).getTime() < Date.now())
    throw Object.assign(new Error('Token expirado'), { status: 400 })
  await row.update({ used_at: new Date() })
  return { user_id: row.user_id }
}
