import fs from 'node:fs'
import path from 'node:path'

export class LocalStorageProvider {
  constructor({ baseDir, publicBase = '/uploads' }) {
    this.baseDir = path.resolve(baseDir || 'uploads')
    this.publicBase = String(publicBase || '/uploads').replace(/\/+$/, '')
    fs.mkdirSync(this.baseDir, { recursive: true })
  }

  async saveMany(files = [], parts = []) {
    const dir = path.join(this.baseDir, ...parts.map(String))
    fs.mkdirSync(dir, { recursive: true })
    const out = []

    for (const f of files) {
      const safeOrig = String(f.originalname || 'file').replace(/[\/\\]/g, '_')
      const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeOrig}`
      const dest = path.join(dir, name)

      // soporta memoryStorage; si usas diskStorage reemplazá por fs.copyFileSync
      fs.writeFileSync(dest, f.buffer)

      // relpath POSIX
      const relpath = [...parts.map(String), name].join('/')

      const publicUrl = `${this.publicBase}/${relpath}`

      out.push({
        provider: 'local',
        drive_file_id: null,
        name: f.originalname,
        mime: f.mimetype,
        size: f.size,
        publicUrl: publicUrl,        // 👈 agregado para compatibilidad con controlador
        webViewLink: publicUrl,      // 👈 listo para <img src>
        webContentLink: publicUrl,   // 👈 idem
        relpath,
        diskPath: dest,
      })
    }

    return out
  }

  async remove(relpathOrAbs) {
    const p = path.isAbsolute(relpathOrAbs)
      ? relpathOrAbs
      : path.join(this.baseDir, relpathOrAbs)

    try { fs.unlinkSync(p); return { ok: true } }
    catch (e) { if (e.code === 'ENOENT') return { ok: true, note: 'not found' }; throw e }
  }

  async getFolderWebLink(parts = []) {
    return `${this.publicBase}/${parts.join('/')}`
  }
}
