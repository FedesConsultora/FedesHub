// /backend/src/modules/chat/repositories/attachments.repo.js
import { Op } from 'sequelize'
import { initModels } from '../../../models/registry.js'
const m = await initModels()

/**
 * Lista adjuntos de un canal con filtros básicos.
 * params:
 *  - kind: 'files' (default) | 'images'
 *  - limit: número máx. (<=500)
 *  - before_id: pagina por id de mensaje (tráeme adjuntos de msgs con id < before_id)
 */
export async function listChannelAttachments(canal_id, params = {}, t) {
  const limit = Math.min(Number(params.limit || 100), 500)
  const before_id = params.before_id ? Number(params.before_id) : null
  const kind = String(params.kind || 'files').toLowerCase()
  const validKind = kind === 'files' || kind === 'images' ? kind : 'files'
  
  const whereMsg = { canal_id, deleted_at: null }
  if (before_id) whereMsg.id = { [Op.lt]: before_id }

  const whereAdj = {}
  if (validKind === 'images') {
    whereAdj.mime_type = { [Op.iLike]: 'image/%' }
  } else if (kind === 'files') {
    whereAdj.mime_type = { [Op.notILike]: 'image/%' }
  }

  // Traemos mensajes del canal con al menos un adjunto que cumpla el filtro
  const rows = await m.ChatMensaje.findAll({
    where: whereMsg,
    attributes: ['id', 'created_at'],
    include: [{
      model: m.ChatAdjunto,
      as: 'adjuntos',
      attributes: ['id','mensaje_id','file_url','file_name','mime_type','size_bytes','created_at'],
      where: whereAdj,
      required: true
    }],
    order: [['id', 'DESC']],   // ordenamos por mensaje más nuevo
    limit,
    transaction: t
  })

  // aplanar adjuntos
  const out = []
  for (const r of rows) {
    for (const a of (r.adjuntos || [])) {
      out.push({
        id: a.id,
        mensaje_id: a.mensaje_id,
        file_url: a.file_url,
        file_name: a.file_name,
        mime_type: a.mime_type,
        size_bytes: a.size_bytes,
        created_at: a.created_at
      })
    }
  }
  return out
}
