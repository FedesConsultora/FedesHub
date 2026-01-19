// Forced sync comment
import storageConfig from './config.js'
import { GoogleDriveProvider } from './providers/GoogleDriveProvider.js'
import { LocalStorageProvider } from './providers/LocalStorageProvider.js'

function makeProviderByName(name) {
  const driver = (name || '').toLowerCase()
  if (driver === 'drive') {
    return new GoogleDriveProvider(storageConfig.drive)
  }
  // local por defecto
  return new LocalStorageProvider({
    baseDir: storageConfig.baseDir,
    publicBase: storageConfig.publicBase
  })
}

const providers = {
  default: makeProviderByName(storageConfig.driverDefault),
  chat: makeProviderByName(storageConfig.chatDriver),
  tareas: makeProviderByName(storageConfig.tareasDriver),
}

export function getProvider(domain = 'default') {
  return providers[domain] || providers.default
}

export const saveUploadedFiles = (files = [], parts = [], domain = 'default') =>
  getProvider(domain).saveMany(files, parts)

export const deleteStoredFile = (idOrPath, domain = 'default') =>
  getProvider(domain).remove(idOrPath)

export const getFolderLink = (parts = [], domain = 'default') =>
  getProvider(domain).getFolderWebLink(parts)

// 🔙 Back-compat: exportamos `storage` con sólo `checkAccess()` para el startup
export const storage = {
  async checkAccess() {
    const drivers = [
      storageConfig.driverDefault,
      storageConfig.chatDriver,
      storageConfig.tareasDriver
    ].map(s => (s || '').toLowerCase())

    // Si no hay ningún driver "drive", listo (todo local)
    if (!drivers.includes('drive')) return { ok: true, note: 'local storage only' }

    // Preferimos chequear el provider de "tareas" (que es el que usa Drive),
    // si no, el default, si no, el de chat.
    const preferred =
      storageConfig.tareasDriver === 'drive' ? 'tareas' :
        storageConfig.driverDefault === 'drive' ? 'default' :
          'chat'

    const prov = getProvider(preferred)
    if (typeof prov.checkAccess === 'function') {
      return prov.checkAccess()
    }
    return { ok: true, note: 'drive provider has no checkAccess()' }
  }
}
