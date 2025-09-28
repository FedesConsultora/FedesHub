// backend/src/core/storage/providers/GoogleDriveProvider.js
import { google } from 'googleapis';
import { Readable } from 'node:stream'; // 👈 agregar

const supportsAllDrives = { supportsAllDrives: true, includeItemsFromAllDrives: true };

// Helper: un id de Unidad compartida (Shared Drive) válido empieza con "0A..."
const isSharedDriveId = (id) => /^0A[a-zA-Z0-9_-]+$/.test(id || '');

export class GoogleDriveProvider {
  constructor(opts) {
    this.opts = opts || {};
    const auth = new google.auth.GoogleAuth({
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file',
      ],
    });
    this.drive = google.drive({ version: 'v3', auth });
    this._baseFolderIdPromise = null;
  }

  // Verifica acceso según la config:
  // - Si hay sharedDriveId (0A...), consulta drives.get
  // - Si hay baseFolderId (folder dentro de cualquier unidad), consulta files.get
  async checkAccess() {
    if (this.opts.sharedDriveId) {
      if (!isSharedDriveId(this.opts.sharedDriveId)) {
        return {
          ok: false,
          error:
            'DRIVE_SHARED_DRIVE_ID parece un folderId (empieza con 1…). Dejalo vacío o usa un id 0A… de unidad compartida.',
        };
      }
      try {
        const { data } = await this.drive.drives.get({ driveId: this.opts.sharedDriveId });
        return { ok: true, drive: { id: data.id, name: data.name } };
      } catch (e) {
        return { ok: false, error: e?.errors || e?.message };
      }
    }

    if (this.opts.baseFolderId) {
      try {
        const { data } = await this.drive.files.get({
          fileId: this.opts.baseFolderId,
          fields: 'id,name,mimeType,driveId,parents',
          supportsAllDrives: true,
        });
        if (data.mimeType !== 'application/vnd.google-apps.folder') {
          return { ok: false, error: 'DRIVE_BASE_FOLDER_ID no es una carpeta' };
        }
        return { ok: true, folder: { id: data.id, name: data.name, driveId: data.driveId || null } };
      } catch (e) {
        return { ok: false, error: e?.errors || e?.message };
      }
    }

    return { ok: true, note: 'My Drive (sin sharedDriveId ni baseFolderId)' };
  }

  // Busca o crea una carpeta con "name" dentro de "parentId" (o de baseFolderId si no se pasa parent)
  async ensureFolder(name, parentId) {
    const parent = parentId || this.opts.baseFolderId || null;

    const q = [
      "mimeType = 'application/vnd.google-apps.folder'",
      `name = '${name.replace(/'/g, "\\'")}'`,
      parent ? `'${parent}' in parents` : null,
      'trashed = false',
    ]
      .filter(Boolean)
      .join(' and ');

    // Si hay sharedDriveId y NO hay parent explícito, limitamos el search a esa unidad (corpora: 'drive')
    // En cualquier otro caso, buscamos en 'allDrives' (sirve para folderId en cualquier unidad)
    const inSharedDriveScope = !!this.opts.sharedDriveId && !parent;

    const res = await this.drive.files.list({
      q,
      fields: 'files(id,name)',
      spaces: 'drive',
      corpora: inSharedDriveScope ? 'drive' : 'allDrives',
      driveId: inSharedDriveScope ? this.opts.sharedDriveId : undefined,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const found = res.data.files?.[0];
    if (found) return found.id;

    // Crear carpeta bajo el parent (si hay). Ojo: NO setear driveId acá; va sólo en files.list
    const create = await this.drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parent ? { parents: [parent] } : undefined),
      },
      fields: 'id',
      supportsAllDrives: true,
    });
    return create.data.id;
  }

  // Crea una ruta a partir de la carpeta base
  async ensurePath(pathParts = []) {
    const base = await this.getBaseFolderId(); // raíz lógica (p.ej. Fedes-Creative o su subcarpeta FedesHub)
    let parent = base;
    for (const part of pathParts) {
      parent = await this.ensureFolder(String(part), parent);
    }
    return parent;
  }

  // Determina la carpeta base:
  // - Si hay baseFolderId ⇒ usarla (y opcionalmente crear/buscar baseFolderName adentro)
  // - Si hay sharedDriveId ⇒ crear/buscar baseFolderName en la raíz de esa unidad (0A…)
  // - Si nada ⇒ crear/buscar baseFolderName en My Drive
  async getBaseFolderId() {
    if (this._baseFolderIdPromise) return this._baseFolderIdPromise;
    this._baseFolderIdPromise = (async () => {
      if (this.opts.baseFolderId) {
        return this.opts.baseFolderName
          ? this.ensureFolder(this.opts.baseFolderName, this.opts.baseFolderId)
          : this.opts.baseFolderId;
      }
      if (this.opts.sharedDriveId) {
        // En shared drive podés usar el id 0A… como parent (raíz)
        return this.ensureFolder(this.opts.baseFolderName || 'FedesHub', this.opts.sharedDriveId);
      }
      // My Drive
      return this.ensureFolder(this.opts.baseFolderName || 'FedesHub', undefined);
    })();
    return this._baseFolderIdPromise;
  }

  async applySharing(fileId) {
    const mode = this.opts.shareMode;
    if (mode === 'inherit') return;

    try {
      if (mode === 'public') {
        await this.drive.permissions.create({
          fileId,
          requestBody: { role: 'reader', type: 'anyone' },
          ...supportsAllDrives,
        });
      } else if (mode === 'domain' && this.opts.domain) {
        await this.drive.permissions.create({
          fileId,
          requestBody: { role: 'reader', type: 'domain', domain: this.opts.domain },
          ...supportsAllDrives,
        });
      }
    } catch (e) {
      // no abortamos si falla el share — logueá si querés
    }
  }

  async saveMany(files = [], pathParts = []) {
    const parentId = await this.ensurePath(pathParts);
    const out = [];
    for (const f of files) {
      const meta = await this.saveOne(f, parentId);
      out.push(meta);
    }
    return out;
  }

  async saveOne(file, parentId) {
    const { originalname, buffer, mimetype, size, path, stream } = file;

    // 🔧 Normalizamos a stream según lo que venga de multer:
    // - memoryStorage => file.buffer (Buffer)
    // - diskStorage   => file.path (string)
    // - o ya viene un stream (file.stream)
    let body;
    if (stream && typeof stream.pipe === 'function') {
      body = stream;
    } else if (buffer && Buffer.isBuffer(buffer)) {
      body = Readable.from(buffer);                // 👈 acá está la clave
    } else if (path) {
      const fs = await import('node:fs');
      body = fs.createReadStream(path);
    } else {
      throw new Error('Archivo inválido: no hay stream ni buffer ni path');
    }

    const create = await this.drive.files.create({
      requestBody: { name: originalname, parents: [parentId] },
      media: { mimeType: mimetype || 'application/octet-stream', body }, // 👈 stream
      fields: 'id, webViewLink, webContentLink, iconLink',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const id = create.data.id;
    await this.applySharing(id);

    const get = await this.drive.files.get({
      fileId: id,
      fields: 'id, name, webViewLink, webContentLink, thumbnailLink, iconLink, mimeType',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    return {
      provider: 'drive',
      drive_file_id: id,
      name: originalname,
      mime: get.data.mimeType || mimetype,
      size,
      webViewLink: get.data.webViewLink,
      webContentLink: get.data.webContentLink || null,
      iconLink: get.data.iconLink || null,
    };
  }

  async remove(fileId) {
    await this.drive.files.delete({ fileId, ...supportsAllDrives });
    return { ok: true };
  }

  async getFolderWebLink(pathParts = []) {
    const folderId = await this.ensurePath(pathParts);
    return `https://drive.google.com/drive/folders/${folderId}`;
  }
}