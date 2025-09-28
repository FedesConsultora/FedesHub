// backend/src/modules/chat/chat.storage.js
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { saveUploadedFiles } from '../../infra/storage/index.js';
import { initModels } from '../../models/registry.js';

const mReg = await initModels();
const BASE_DIR = process.env.STORAGE_BASE_DIR || 'uploads';

// Carpeta del mensaje: uploads/chat/canal-{canal_id}/msg-{mensaje_id}
function msgParts(canal_id, mensaje_id) {
  return ['chat', `canal-${canal_id}`, `msg-${mensaje_id}`];
}

// Guarda todos los files de un mensaje y persiste ChatAdjunto
export async function saveMessageFiles(canal_id, mensaje_id, files = []) {
  if (!files?.length) return []
  // 👉 LOCAL (dominio chat)
  const metas = await saveUploadedFiles(files, ['chat', `canal-${canal_id}`, `msg-${mensaje_id}`], 'chat')

  const rows = []
  for (const m of metas) {
    const row = await mReg.ChatAdjunto.create({
      mensaje_id,
      file_url: m.webContentLink || m.webViewLink,   // siempre viene poblado
      file_name: m.name,
      mime_type: m.mime || 'application/octet-stream',
      size_bytes: m.size || null,
      width: null, height: null, duration_sec: null
    })
    rows.push(row.toJSON())
  }
  return rows
}

// Borra la carpeta del mensaje y filas ChatAdjunto
export async function removeMessageFiles(canal_id, mensaje_id) {
  // 1) DB
  await mReg.ChatAdjunto.destroy({ where: { mensaje_id } });

  // 2) FS: rm -rf uploads/chat/canal-{id}/msg-{id}
  const dir = path.join(path.resolve(BASE_DIR), ...msgParts(canal_id, mensaje_id));
  try {
    await fsp.rm(dir, { recursive: true, force: true });
  } catch (e) {
    // no rompemos el flujo si falla; log opcional
    console.warn('[chat.storage] rm dir', dir, e?.message);
  }
}
