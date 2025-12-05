// backend/db/seeders/0016-equipo-roles-cargos.cjs
'use strict';
const argon2 = require('argon2');
const fs = require('fs');
const path = require('path');

/**
 * 0016 - equipo + roles + cargos + chat (idempotente, sin duplicar)
 * - SIMPLIFICADO: Usa 3 niveles de rol: NivelA (Admin), NivelB (Líder), NivelC (Colaborador)
 * - Crea/actualiza usuarios (Nombre123!), asigna nivel según c_level
 * - Re-vincula por nombre/apellido y borra feders duplicados.
 * - AGREGA: canales de chat por defecto + membresías + mensaje de bienvenida (pinned).
 */

const PEOPLE = [
  // NivelC: Colaboradores
  { nombre: 'Enzo', apellido: 'Pinotti', cargo: 'Analista de Sistemas', email: 'epinotti@fedes.ai', nivel: 'NivelB' },
  { nombre: 'Andre', apellido: 'Coronel Vargas', cargo: 'Analista Audiovisual', email: 'acoronelvargas@fedes.ai' },
  { nombre: 'Mateo', apellido: 'Germano', cargo: 'Analista Audiovisual', email: 'mgermano@fedes.ai' },
  { nombre: 'Florencia', apellido: 'Marchesotti', cargo: 'Analista de Diseño', email: 'fmarchesotti@fedes.ai' },
  { nombre: 'Gonzalo', apellido: 'Canibano', cargo: 'Analista de Cuentas', email: 'gcanibano@fedes.ai' },
  { nombre: 'Paola', apellido: 'López', cargo: 'Analista de Cuentas', email: 'plopez@fedes.ai' },
  { nombre: 'Juan', apellido: 'Perozo', cargo: 'Analista de Diseño', email: 'jperozo@fedes.ai' },
  { nombre: 'Matias', apellido: 'Lazcano', cargo: 'Analista Audiovisual', email: 'mlazcano@fedes.ai' },
  { nombre: 'Belen', apellido: 'Espilman', cargo: 'Desarrolladora Web', email: 'bespilman@fedes.ai' },

  // NivelB: Líderes
  { nombre: 'Romina', apellido: 'Albanesi', cargo: 'Responsable Editorial y de Comunicación', email: 'ralbanesi@fedes.ai', nivel: 'NivelB' },
  { nombre: 'Federico', apellido: 'Chironi', cargo: 'Co-Founder y CEO', email: 'fedechironi@fedes.ai', nivel: 'NivelB' },
  { nombre: 'Federico', apellido: 'Juan', cargo: 'Co-Founder y CGO', email: 'fedejuan@fedes.ai', nivel: 'NivelB' },
  { nombre: 'Martin', apellido: 'Spinelli', cargo: 'COO', email: 'martin@fedes.ai', nivel: 'NivelB' },
];

// Función para determinar nivel de rol: nivel explícito > NivelC por defecto
const getNivel = (p) => p.nivel || 'NivelC';

// Sólo estos 6 se asignan/aseguran explícitamente de célula
const CEL_ASSIGN = {
  'Mateo|Germano': 'celula-1',
  'Paola|López': 'celula-1',
  'Florencia|Marchesotti': 'celula-1',
  'Andre|Coronel Vargas': 'celula-2',
  'Gonzalo|Canibano': 'celula-2',
  'Juan|Perozo': 'celula-2',
};

// ===== Helpers comunes (password, fechas) =====
const strip = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const todayISO = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10);
};
const passFor = (nombre) => `${strip(nombre)}123!`;

// ===== Helper Avatar =====
const AVATAR_EXTS = ['.webp', '.jpg', '.jpeg', '.png'];
const AVATAR_DIR = path.join(__dirname, '..', '..', 'public', 'avatars'); // backend/public/avatars
const AVATAR_BASE = process.env.AVATAR_BASE_URL || '/avatars';              // opcional CDN/base

const slugify = s =>
  (s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

function findAvatarUrl(basename) {
  for (const ext of AVATAR_EXTS) {
    const filePath = path.join(AVATAR_DIR, basename + ext);
    if (fs.existsSync(filePath)) return `${AVATAR_BASE}/${basename}${ext}`;
  }
  return null;
}

/**
 * Intenta varias convenciones de nombre de archivo:
 *  - usuario del email (antes de @)
 *  - inicial + último token del apellido (ej: "avargas")
 *  - inicial + apellido completo sin espacios (ej: "acoronelvargas")
 *  - nombre-apellido (slug) (ej: "romina-albanesi")
 */
function resolveFederAvatar({ email, nombre, apellido }) {
  const userPart = (email || '').split('@')[0];              // epinotti
  const firstInitial = (strip(nombre || '').toLowerCase() || 'x')[0];
  const apSlug = slugify(apellido);                           // "coronel-vargas"
  const apNoSpace = apSlug.replace(/-/g, '');                 // "coronelvargas"
  const lastToken = apSlug.split('-').filter(Boolean).pop() || apSlug; // "vargas"

  const candidates = [
    userPart,                                // epinotti, mgermano, ralbanesi...
    `${firstInitial}${lastToken}`,           // avargas, fchironi, fjuan...
    `${firstInitial}${apNoSpace}`,           // acoronelvargas (fallback)
    `${slugify(nombre)}-${apSlug}`           // romina-albanesi
  ].filter(Boolean);

  for (const base of candidates) {
    const url = findAvatarUrl(base);
    if (url) return url;
  }
  return null;
}

module.exports = {
  async up(qi) {
    const t = await qi.sequelize.transaction();
    try {
      const now = new Date();
      const today = todayISO();

      const one = async (sql, repl = {}) =>
        (await qi.sequelize.query(sql, { transaction: t, replacements: repl }))[0][0] || null;

      // === Requisitos base ===
      let dom = await one(`SELECT id FROM "AuthEmailDominio" WHERE dominio='fedes.ai' LIMIT 1`);
      if (!dom) {
        await qi.bulkInsert('AuthEmailDominio', [
          { dominio: 'fedes.ai', is_activo: true, created_at: now, updated_at: now }
        ], { transaction: t });
        dom = await one(`SELECT id FROM "AuthEmailDominio" WHERE dominio='fedes.ai' LIMIT 1`);
      }

      const estFed = await one(`SELECT id FROM "FederEstadoTipo" WHERE codigo='activo' LIMIT 1`);
      if (!estFed) throw new Error('Falta FederEstadoTipo.activo (0003)');

      // === Asegurar Células 1 y 2 ===
      const [[estCelAct]] = await qi.sequelize.query(
        `SELECT id FROM "CelulaEstado" WHERE codigo='activa' LIMIT 1`, { transaction: t }
      );
      const ensureCelula = async (nombre, slug) => {
        const row = await one(`SELECT id FROM "Celula" WHERE slug=:slug OR nombre=:nombre LIMIT 1`,
          { slug, nombre });
        if (row) return row.id;
        await qi.bulkInsert('Celula', [{
          nombre, slug, estado_id: estCelAct.id,
          descripcion: null, avatar_url: null, cover_url: null, perfil_md: null,
          created_at: now, updated_at: now
        }], { transaction: t });
        const created = await one(`SELECT id FROM "Celula" WHERE slug=:slug LIMIT 1`, { slug });
        return created?.id;
      };
      const cel1Id = await ensureCelula('Célula 1', 'celula-1');
      const cel2Id = await ensureCelula('Célula 2', 'celula-2');
      const celBySlug = { 'celula-1': cel1Id, 'celula-2': cel2Id };

      // RolTipo miembro (para CRA)
      const crtMiembro = await one(`SELECT id FROM "CelulaRolTipo" WHERE codigo='miembro' LIMIT 1`);
      if (!crtMiembro) throw new Error('Falta CelulaRolTipo.miembro (0007)');

      // Roles disponibles (3 niveles)
      const [roleRows] = await qi.sequelize.query(
        `SELECT id, nombre FROM "Rol" WHERE nombre IN ('NivelA', 'NivelB', 'NivelC')`,
        { transaction: t }
      );
      const rid = Object.fromEntries(roleRows.map(r => [r.nombre, r.id]));

      // Cargos
      const cargoNombres = Array.from(new Set(PEOPLE.map(p => p.cargo)));
      const [cargoRows] = await qi.sequelize.query(
        `SELECT id, nombre FROM "Cargo" WHERE nombre IN (:n)`,
        { transaction: t, replacements: { n: cargoNombres } }
      );
      const cargoId = Object.fromEntries(cargoRows.map(r => [r.nombre, r.id]));
      for (const nm of cargoNombres) {
        if (!cargoId[nm]) throw new Error(`Falta cargo "${nm}" (corré 0015-cargos-core)`);
      }

      // === Users: crear o resetear "Nombre123!" ===
      const baseEmails = ['sistemas@fedes.ai']; // owner de canales y mensajes seed
      const emails = Array.from(new Set([...baseEmails, ...PEOPLE.map(p => p.email)]));
      const [existingUsers] = await qi.sequelize.query(
        `SELECT id, email FROM "User" WHERE email IN (:e)`, { transaction: t, replacements: { e: emails } }
      );
      const uByEmail = Object.fromEntries(existingUsers.map(u => [u.email, u]));

      // crear faltantes
      for (const email of emails) {
        if (!uByEmail[email]) {
          const nombre = email.split('@')[0]; // fallback para Sistemas/otros
          const hash = await argon2.hash(passFor(nombre), {
            type: argon2.argon2id, timeCost: 3, memoryCost: 19456, parallelism: 1
          });
          await qi.bulkInsert('User', [{
            email, password_hash: hash, is_activo: true,
            email_dominio_id: dom.id, created_at: now, updated_at: now
          }], { transaction: t });
        }
      }
      // resetear pass a todos: Nombre123!
      for (const email of emails) {
        const nombre = email === 'sistemas@fedes.ai'
          ? 'Sistemas'
          : (PEOPLE.find(p => p.email === email)?.nombre || email.split('@')[0]);
        const hash = await argon2.hash(passFor(nombre), {
          type: argon2.argon2id, timeCost: 3, memoryCost: 19456, parallelism: 1
        });
        await qi.sequelize.query(
          `UPDATE "User" SET password_hash=:h, updated_at=:now WHERE email=:e`,
          { transaction: t, replacements: { h: hash, now, e: email } }
        );
      }

      // releer users
      const [users] = await qi.sequelize.query(
        `SELECT id, email FROM "User" WHERE email IN (:e)`,
        { transaction: t, replacements: { e: emails } }
      );
      const uid = Object.fromEntries(users.map(u => [u.email, u.id]));
      const sistemasUserId = uid['sistemas@fedes.ai'];

      // === Feders: re-vincular por NOMBRE y desduplicar (con avatar) ===
      const [fRows] = await qi.sequelize.query(
        `SELECT id, user_id, nombre, apellido, celula_id
           FROM "Feder"`,
        { transaction: t }
      );
      const byUser = new Map(fRows.filter(f => f.user_id).map(f => [f.user_id, f]));

      const fedIdByUser = {};
      for (const p of PEOPLE) {
        const user_id = uid[p.email];
        if (!user_id) continue;

        const wantSlug = CEL_ASSIGN[`${p.nombre}|${p.apellido}`];
        const desiredCelId = wantSlug ? celBySlug[wantSlug] : null;
        const avatar_url = resolveFederAvatar(p);

        // A) Todos los feders que tengan ese nombre/apellido → CONSOLIDAR
        const [sameNameRows] = await qi.sequelize.query(`
          SELECT id, user_id FROM "Feder"
          WHERE LOWER(nombre)=LOWER(:n) AND LOWER(apellido)=LOWER(:a)
          ORDER BY id ASC
        `, { transaction: t, replacements: { n: p.nombre, a: p.apellido } });

        if (sameNameRows.length) {
          const keep = sameNameRows[0];

          await qi.sequelize.query(`
            UPDATE "Feder"
               SET user_id   = :u,
                   celula_id = :cel,
                   estado_id = :est,
                   avatar_url = COALESCE(:avatar, avatar_url),
                   is_activo = true,
                   updated_at = :now
             WHERE id = :id
          `, { transaction: t, replacements: { id: keep.id, u: user_id, cel: desiredCelId, est: estFed.id, avatar: avatar_url, now } });

          // borrar duplicados (dejar el primero)
          const idsToDelete = sameNameRows.slice(1).map(r => r.id);
          if (idsToDelete.length) {
            await qi.sequelize.query(`DELETE FROM "Feder" WHERE id = ANY(:ids)`,
              { transaction: t, replacements: { ids: idsToDelete } });
          }

          // Sanear: si existía otro feder linkeado a este user, eliminarlo
          await qi.sequelize.query(`
            DELETE FROM "Feder" WHERE user_id=:u AND id<>:keep
          `, { transaction: t, replacements: { u: user_id, keep: keep.id } });

          fedIdByUser[user_id] = keep.id;
          continue;
        }

        // B) Si ya existe por user → sincronizar célula y backfill de avatar (sin pisar si ya hay)
        if (byUser.has(user_id)) {
          const f = byUser.get(user_id);
          fedIdByUser[user_id] = f.id;
          await qi.sequelize.query(
            `UPDATE "Feder"
                SET celula_id = :cel,
                    avatar_url = COALESCE(:avatar, avatar_url),
                    updated_at = :now
              WHERE id = :id`,
            { transaction: t, replacements: { id: f.id, cel: desiredCelId, avatar: avatar_url, now } }
          );
          continue;
        }

        // C) Crear feder nuevo (célula si corresponde, si no → NULL) con avatar
        const [ins] = await qi.bulkInsert('Feder', [{
          user_id, celula_id: desiredCelId, estado_id: estFed.id,
          nombre: p.nombre || '—', apellido: p.apellido || '—',
          avatar_url,
          is_activo: true, fecha_ingreso: today, created_at: now, updated_at: now
        }], { transaction: t, returning: true });

        let fid = ins?.id;
        if (!fid) {
          const [[row]] = await qi.sequelize.query(
            `SELECT id FROM "Feder" WHERE user_id=:u ORDER BY id DESC LIMIT 1`,
            { transaction: t, replacements: { u: user_id } }
          );
          fid = row?.id;
        }
        fedIdByUser[user_id] = fid;
      }

      // === Roles para cada persona (simplificado a 3 niveles) ===
      const [urPairs] = await qi.sequelize.query(
        `SELECT user_id, rol_id FROM "UserRol" WHERE user_id IN (:ids)`,
        { transaction: t, replacements: { ids: Object.values(uid) } }
      );
      const have = new Set(urPairs.map(r => `${r.user_id}:${r.rol_id}`));
      const toUR = [];
      for (const p of PEOPLE) {
        const u = uid[p.email]; if (!u) continue;
        const nivel = getNivel(p); // NivelA, NivelB o NivelC
        const rid_ = rid[nivel];
        if (!rid_) continue;
        const k = `${u}:${rid_}`;
        if (!have.has(k)) { have.add(k); toUR.push({ user_id: u, rol_id: rid_, created_at: now }); }
      }
      if (toUR.length) await qi.bulkInsert('UserRol', toUR, { transaction: t });

      // === Cargo principal por feder (upsert suave) ===
      const [actives] = await qi.sequelize.query(
        `SELECT feder_id, cargo_id, es_principal FROM "FederCargo"
          WHERE feder_id IN (SELECT id FROM "Feder" WHERE user_id IN (:ids))
            AND hasta IS NULL`,
        { transaction: t, replacements: { ids: Object.values(uid) } }
      );
      const activeByFeder = new Map();
      for (const r of actives) {
        if (!activeByFeder.has(r.feder_id)) activeByFeder.set(r.feder_id, []);
        activeByFeder.get(r.feder_id).push(r);
      }
      const toFC = [];
      for (const p of PEOPLE) {
        const u = uid[p.email]; const fid = fedIdByUser[u]; if (!fid) continue;
        const cId = cargoId[p.cargo]; if (!cId) continue;

        const current = activeByFeder.get(fid) || [];
        const alreadySame = current.some(r => r.cargo_id === cId);
        if (alreadySame) continue;

        const hadPrincipal = current.some(r => r.es_principal);
        if (hadPrincipal) {
          await qi.sequelize.query(`
            UPDATE "FederCargo" SET es_principal=false
            WHERE feder_id=:fid AND es_principal=true AND hasta IS NULL
          `, { transaction: t, replacements: { fid } });
        }
        toFC.push({
          feder_id: fid, cargo_id: cId, es_principal: true,
          desde: today, hasta: null, observacion: null,
          created_at: now
        });
      }
      if (toFC.length) await qi.bulkInsert('FederCargo', toFC, { transaction: t });

      // === Miembros por célula (CRA) SOLO para los 6 mapeados ===
      for (const p of PEOPLE) {
        const wantSlug = CEL_ASSIGN[`${p.nombre}|${p.apellido}`];
        if (!wantSlug) continue;
        const u = uid[p.email]; const [[fidRow]] = await qi.sequelize.query(
          `SELECT id FROM "Feder" WHERE user_id=:u LIMIT 1`,
          { transaction: t, replacements: { u } }
        );
        const fid = fidRow?.id;
        if (!fid) continue;
        const celId = celBySlug[wantSlug];

        await qi.sequelize.query(`
          UPDATE "CelulaRolAsignacion"
             SET hasta = :today, updated_at = :now
           WHERE feder_id = :fid
             AND rol_tipo_id = :rt
             AND (hasta IS NULL OR hasta > :today)
             AND celula_id <> :cel
        `, { transaction: t, replacements: { fid, rt: crtMiembro.id, today, now, cel: celId } });

        const [[exists]] = await qi.sequelize.query(`
          SELECT id FROM "CelulaRolAsignacion"
          WHERE feder_id = :fid AND rol_tipo_id = :rt AND celula_id = :cel
            AND (hasta IS NULL OR hasta >= :today)
          ORDER BY desde DESC, id DESC
          LIMIT 1
        `, { transaction: t, replacements: { fid, rt: crtMiembro.id, cel: celId, today } });

        if (exists?.id) {
          await qi.sequelize.query(`
            UPDATE "CelulaRolAsignacion"
               SET es_principal = true, updated_at = :now
             WHERE id = :id
          `, { transaction: t, replacements: { id: exists.id, now } });
        } else {
          await qi.bulkInsert('CelulaRolAsignacion', [{
            celula_id: celId, feder_id: fid, rol_tipo_id: crtMiembro.id,
            desde: today, hasta: null, es_principal: true, observacion: null,
            created_at: now, updated_at: now
          }], { transaction: t });
        }
      }

      // === Cerrar CRAs de miembro para NO mapeados (ej: Enzo, Romina)
      for (const p of PEOPLE) {
        if (CEL_ASSIGN[`${p.nombre}|${p.apellido}`]) continue;
        const u = uid[p.email]; const [[fidRow]] = await qi.sequelize.query(
          `SELECT id FROM "Feder" WHERE user_id=:u LIMIT 1`,
          { transaction: t, replacements: { u } }
        );
        const fid = fidRow?.id;
        if (!fid) continue;
        await qi.sequelize.query(`
          UPDATE "CelulaRolAsignacion"
             SET hasta = :today, updated_at = :now
           WHERE feder_id = :fid
             AND rol_tipo_id = :rt
             AND (hasta IS NULL OR hasta > :today)
        `, { transaction: t, replacements: { fid, rt: crtMiembro.id, today, now } });
      }

      // ==================================================================================
      // === CHAT: canales y bienvenida ===================================================
      // ==================================================================================
      // Requisitos
      const [[ctCanal]] = await qi.sequelize.query(`SELECT id FROM "ChatCanalTipo" WHERE codigo='canal'  LIMIT 1`, { transaction: t });
      const [[ctCelula]] = await qi.sequelize.query(`SELECT id FROM "ChatCanalTipo" WHERE codigo='celula' LIMIT 1`, { transaction: t });
      const [[ctCliente]] = await qi.sequelize.query(`SELECT id FROM "ChatCanalTipo" WHERE codigo='cliente' LIMIT 1`, { transaction: t });
      const [[rtOwner]] = await qi.sequelize.query(`SELECT id FROM "ChatRolTipo"   WHERE codigo='owner'  LIMIT 1`, { transaction: t });
      const [[rtMember]] = await qi.sequelize.query(`SELECT id FROM "ChatRolTipo"   WHERE codigo='member' LIMIT 1`, { transaction: t });

      if (!ctCanal?.id || !rtOwner?.id || !rtMember?.id) {
        throw new Error('Faltan catálogos de chat (0013-chat-catalogs).');
      }
      if (!sistemasUserId) throw new Error('Falta usuario sistemas@fedes.ai (0005).');

      async function ensureChannel({ tipo_id, slug, nombre, topic = null, is_privado = false, only_mods_can_post = false, slowmode_seconds = 0, celula_id = null, cliente_id = null }) {
        const [[exists]] = await qi.sequelize.query(
          `SELECT id FROM "ChatCanal" WHERE slug=:slug LIMIT 1`,
          { transaction: t, replacements: { slug } }
        );
        if (exists?.id) return exists.id;

        await qi.bulkInsert('ChatCanal', [{
          tipo_id, slug, nombre, topic,
          descripcion: null,
          is_privado, is_archivado: false,
          only_mods_can_post, slowmode_seconds,
          celula_id, cliente_id,
          created_by_user_id: sistemasUserId,
          created_at: now, updated_at: now
        }], { transaction: t });

        const [[row]] = await qi.sequelize.query(
          `SELECT id FROM "ChatCanal" WHERE slug=:slug LIMIT 1`,
          { transaction: t, replacements: { slug } }
        );
        return row?.id;
      }

      async function ensureMember(canal_id, user_id, rol_id) {
        const [[ex]] = await qi.sequelize.query(
          `SELECT id FROM "ChatCanalMiembro" WHERE canal_id=:c AND user_id=:u LIMIT 1`,
          { transaction: t, replacements: { c: canal_id, u: user_id } }
        );
        if (ex?.id) return ex.id;
        await qi.bulkInsert('ChatCanalMiembro', [{
          canal_id, user_id, rol_id,
          is_mute: false, notif_level: 'all',
          joined_at: now
        }], { transaction: t });
        const [[row]] = await qi.sequelize.query(
          `SELECT id FROM "ChatCanalMiembro" WHERE canal_id=:c AND user_id=:u LIMIT 1`,
          { transaction: t, replacements: { c: canal_id, u: user_id } }
        );
        return row?.id;
      }

      async function ensureWelcomeMessage(canal_id, text) {
        const [[existsMsg]] = await qi.sequelize.query(
          `SELECT id FROM "ChatMensaje"
           WHERE canal_id=:c AND body_json->>'seed'='welcome'
           LIMIT 1`,
          { transaction: t, replacements: { c: canal_id } }
        );
        let msgId = existsMsg?.id;
        if (!msgId) {
          await qi.bulkInsert('ChatMensaje', [{
            canal_id, user_id: sistemasUserId, feder_id: null,
            parent_id: null, client_msg_id: null,
            body_text: text,
            body_json: JSON.stringify({ seed: 'welcome' }),
            is_edited: false, edited_at: null, deleted_at: null, deleted_by_user_id: null,
            reply_count: 0, last_reply_at: null,
            created_at: now, updated_at: now
          }], { transaction: t });
          const [[row]] = await qi.sequelize.query(
            `SELECT id FROM "ChatMensaje"
             WHERE canal_id=:c AND body_json->>'seed'='welcome'
             ORDER BY id DESC LIMIT 1`,
            { transaction: t, replacements: { c: canal_id } }
          );
          msgId = row?.id;
        }

        // Pin (orden al final)
        const [[pinExists]] = await qi.sequelize.query(
          `SELECT id FROM "ChatPin" WHERE canal_id=:c AND mensaje_id=:m LIMIT 1`,
          { transaction: t, replacements: { c: canal_id, m: msgId } }
        );
        if (!pinExists?.id) {
          const [[maxRow]] = await qi.sequelize.query(
            `SELECT COALESCE(MAX(pin_orden),0) AS maxo FROM "ChatPin" WHERE canal_id=:c`,
            { transaction: t, replacements: { c: canal_id } }
          );
          const orden = (maxRow?.maxo || 0) + 1;
          await qi.bulkInsert('ChatPin', [{
            canal_id, mensaje_id: msgId, pinned_by_user_id: sistemasUserId, pin_orden: orden, pinned_at: now
          }], { transaction: t });
        }
      }

      // ---- Canales base ----
      const canalesDef = [
        { slug: 'general', nombre: '#general', tipo_id: ctCanal.id, topic: 'Bienvenidos al chat general de FedesHub', is_privado: false, only_mods_can_post: false },
        { slug: 'anuncios', nombre: '#anuncios', tipo_id: ctCanal.id, topic: 'Anuncios internos (solo staff publica)', is_privado: false, only_mods_can_post: true },
      ];
      const canalIds = {};
      for (const c of canalesDef) {
        canalIds[c.slug] = await ensureChannel(c);
      }

      // Canales por célula (si existen cel1/cel2)
      if (cel1Id) canalIds['celula-1'] = await ensureChannel({
        slug: 'celula-1', nombre: '#celula-1', tipo_id: ctCelula.id,
        topic: 'Canal de la Célula 1', is_privado: false, only_mods_can_post: false, celula_id: cel1Id
      });
      if (cel2Id) canalIds['celula-2'] = await ensureChannel({
        slug: 'celula-2', nombre: '#celula-2', tipo_id: ctCelula.id,
        topic: 'Canal de la Célula 2', is_privado: false, only_mods_can_post: false, celula_id: cel2Id
      });

      // Canal para Cliente Demo (si existe)
      const [[clienteDemo]] = await qi.sequelize.query(
        `SELECT id FROM "Cliente" WHERE nombre='Cliente Demo' LIMIT 1`, { transaction: t }
      );
      if (clienteDemo?.id && ctCliente?.id) {
        canalIds['cliente-demo'] = await ensureChannel({
          slug: 'cliente-demo', nombre: '#cliente-demo', tipo_id: ctCliente.id,
          topic: 'Canal del Cliente Demo', is_privado: false, only_mods_can_post: false, cliente_id: clienteDemo.id
        });
      }

      // ---- Miembros ----
      // Owner: Sistemas
      for (const slug of Object.keys(canalIds)) {
        await ensureMember(canalIds[slug], sistemasUserId, rtOwner.id);
      }

      // Todos los usuarios del seeder a #general y #anuncios
      const audienceUserIds = Object.values(uid).filter(Boolean);
      for (const slug of ['general', 'anuncios']) {
        const cid = canalIds[slug];
        if (!cid) continue;
        for (const u of audienceUserIds) {
          await ensureMember(cid, u, rtMember.id);
        }
      }

      // Miembros por célula
      // Tomamos primero CRA principal; fallback por Feder.celula_id
      async function federUserIdsByCelula(celulaId) {
        const [cra] = await qi.sequelize.query(`
          SELECT f.user_id
          FROM "CelulaRolAsignacion" cra
          JOIN "Feder" f ON f.id = cra.feder_id
          WHERE cra.celula_id=:cel AND cra.es_principal=true AND (cra.hasta IS NULL OR cra.hasta >= :today)
        `, { transaction: t, replacements: { cel: celulaId, today } });
        let ids = cra.map(r => r.user_id).filter(Boolean);
        if (!ids.length) {
          const [ff] = await qi.sequelize.query(`
            SELECT user_id FROM "Feder" WHERE celula_id=:cel
          `, { transaction: t, replacements: { cel: celulaId } });
          ids = ff.map(r => r.user_id).filter(Boolean);
        }
        return Array.from(new Set(ids));
      }

      if (canalIds['celula-1'] && cel1Id) {
        for (const u of await federUserIdsByCelula(cel1Id)) {
          await ensureMember(canalIds['celula-1'], u, rtMember.id);
        }
      }
      if (canalIds['celula-2'] && cel2Id) {
        for (const u of await federUserIdsByCelula(cel2Id)) {
          await ensureMember(canalIds['celula-2'], u, rtMember.id);
        }
      }

      // Cliente Demo: invitar miembros de Célula 1 (si canal existe)
      if (canalIds['cliente-demo'] && cel1Id) {
        for (const u of await federUserIdsByCelula(cel1Id)) {
          await ensureMember(canalIds['cliente-demo'], u, rtMember.id);
        }
      }

      // ---- Mensajes de bienvenida (pinned) ----
      await ensureWelcomeMessage(canalIds['general'], '👋 ¡Bienvenidos a #general! Usen este canal para discusiones transversales.');
      await ensureWelcomeMessage(canalIds['anuncios'], '📣 Canal de anuncios internos. Sólo el staff puede publicar aquí.');
      if (canalIds['celula-1']) {
        await ensureWelcomeMessage(canalIds['celula-1'], '👥 Bienvenidos a #celula-1. Canal operativo de la célula.');
      }
      if (canalIds['celula-2']) {
        await ensureWelcomeMessage(canalIds['celula-2'], '👥 Bienvenidos a #celula-2. Canal operativo de la célula.');
      }
      if (canalIds['cliente-demo']) {
        await ensureWelcomeMessage(canalIds['cliente-demo'], '🤝 Canal del Cliente Demo. Coordinación, materiales y enlaces.');
      }

      // ==================================================================================
      // === FIN CHAT =====================================================================
      // ==================================================================================

      await t.commit();
    } catch (e) { await t.rollback(); throw e; }
  },

  async down(qi) {
    // Limpia sólo roles asignados en este seeder (no borra usuarios ni feders)
    const emails = PEOPLE.map(p => p.email);
    const t = await qi.sequelize.transaction();
    try {
      const [users] = await qi.sequelize.query(
        `SELECT id FROM "User" WHERE email IN (:e)`, { transaction: t, replacements: { e: emails } }
      );
      const uids = users.map(u => u.id);
      if (uids.length) {
        await qi.sequelize.query(
          `DELETE FROM "UserRol" WHERE user_id = ANY(:ids)`,
          { transaction: t, replacements: { ids: uids } }
        );
      }
      // No borramos canales ni mensajes (datos de trabajo)
      await t.commit();
    } catch (e) { await t.rollback(); throw e; }
  }
};
