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
  // NivelA: Directivos / C-Level
  { nombre: 'Martin', apellido: 'Spinelli', cargo: 'COO', email: 'martin@fedesconsultora.com', nivel: 'NivelA' },
  { nombre: 'Federico', apellido: 'Juan', cargo: 'Co-Founder y CGO', email: 'fedejuan@fedesconsultora.com', nivel: 'NivelA' },
  { nombre: 'Federico', apellido: 'Chironi', cargo: 'Co-Founder y CEO', email: 'fedechironi@fedesconsultora.com', nivel: 'NivelA' },
  { nombre: 'Romina', apellido: 'Albanesi', cargo: 'Responsable Editorial y de Comunicación', email: 'romina@fedesconsultora.com', nivel: 'RRHH' },
  { nombre: 'Enzo', apellido: 'Pinotti', cargo: 'Analista de Sistemas', email: 'epinotti@fedesconsultora.com', nivel: 'NivelB' },

  // NivelC / NivelB (Florencia): Colaboradores
  { nombre: 'Micaela', apellido: 'Martinez', cargo: 'Asesora Comercial', email: 'mmartinez@fedesconsultora.com', nivel: 'NivelC' },
  { nombre: 'Mateo', apellido: 'Germano', cargo: 'Editor de Contenido Audiovisual', email: 'mgermano@fedesconsultora.com' },
  { nombre: 'Florencia', apellido: 'Marchesotti', cargo: 'Coordinadora de proyectos', email: 'florencia@fedesconsultora.com', nivel: 'RRHH' },
  { nombre: 'Gonzalo', apellido: 'Canibano', cargo: 'Ejecutivo de Cuentas', email: 'gcanibano@fedesconsultora.com' },
  { nombre: 'Victoria', apellido: 'Pellegrino', cargo: 'Analista de Cuentas', email: 'vpellegrino@fedesconsultora.com', nivel: 'NivelB' },
  { nombre: 'Juan', apellido: 'Perozo', cargo: 'Diseñador UX/UI', email: 'jperozo@fedesconsultora.com' },
  { nombre: 'Matias', apellido: 'Lazcano', cargo: 'Editor de Proyectos', email: 'mlazcano@fedesconsultora.com' },
  { nombre: 'Belen', apellido: 'Espilman', cargo: 'Desarrolladora Web', email: 'bespilman@fedesconsultora.com' },
];

// Función para determinar nivel de rol: nivel explícito > NivelC por defecto
const getNivel = (p) => p.nivel || 'NivelC';


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
      let dom = await one(`SELECT id FROM "AuthEmailDominio" WHERE dominio='fedesconsultora.com' LIMIT 1`);
      if (!dom) {
        await qi.bulkInsert('AuthEmailDominio', [
          { dominio: 'fedesconsultora.com', is_activo: true, created_at: now, updated_at: now }
        ], { transaction: t });
        dom = await one(`SELECT id FROM "AuthEmailDominio" WHERE dominio='fedesconsultora.com' LIMIT 1`);
      }

      const estFed = await one(`SELECT id FROM "FederEstadoTipo" WHERE codigo='activo' LIMIT 1`);
      if (!estFed) throw new Error('Falta FederEstadoTipo.activo (0003)');


      // === Clientes Especiales ===
      const [[cliTipoA]] = await qi.sequelize.query(`SELECT id FROM "ClienteTipo" WHERE codigo='A' LIMIT 1`, { transaction: t });
      const [[cliEstAct]] = await qi.sequelize.query(`SELECT id FROM "ClienteEstado" WHERE codigo='activo' LIMIT 1`, { transaction: t });

      const ensureCliente = async (nombre, alias) => {
        const row = await one(`SELECT id FROM "Cliente" WHERE nombre=:nombre LIMIT 1`, { nombre });
        if (row) return row.id;
        await qi.bulkInsert('Cliente', [{
          nombre, alias, tipo_id: cliTipoA.id, estado_id: cliEstAct.id,
          descripcion: 'Fedes Cloud - Infraestructura y Sistemas',
          color: '#1e88e5',
          created_at: now, updated_at: now
        }], { transaction: t });
        const created = await one(`SELECT id FROM "Cliente" WHERE nombre=:nombre LIMIT 1`, { nombre });
        return created?.id;
      };
      const cloudClientId = await ensureCliente('066 - Fedes Cloud', 'Fedes Cloud');

      // Roles disponibles (3 niveles)
      const [roleRows] = await qi.sequelize.query(
        `SELECT id, nombre FROM "Rol" WHERE nombre IN ('NivelA', 'NivelB', 'NivelC', 'RRHH')`,
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
      const baseEmails = ['sistemas@fedesconsultora.com']; // owner de canales y mensajes seed
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
        const nombre = email === 'sistemas@fedesconsultora.com'
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
      const sistemasUserId = uid['sistemas@fedesconsultora.com'];

      // === Feders: re-vincular por NOMBRE y desduplicar (con avatar) ===
      const [fRows] = await qi.sequelize.query(
        `SELECT id, user_id, nombre, apellido
           FROM "Feder"`,
        { transaction: t }
      );
      const byUser = new Map(fRows.filter(f => f.user_id).map(f => [f.user_id, f]));

      const fedIdByUser = {};
      for (const p of PEOPLE) {
        const user_id = uid[p.email];
        if (!user_id) continue;

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
                   estado_id = :est,
                   avatar_url = COALESCE(:avatar, avatar_url),
                   is_activo = true,
                   updated_at = :now
             WHERE id = :id
          `, { transaction: t, replacements: { id: keep.id, u: user_id, est: estFed.id, avatar: avatar_url, now } });

          // borrar duplicados (dejar el primero)
          const idsToDelete = sameNameRows.slice(1).map(r => r.id);
          if (idsToDelete.length) {
            await qi.sequelize.query(`DELETE FROM "Feder" WHERE id IN (:ids)`,
              { transaction: t, replacements: { ids: idsToDelete } });
          }

          // Sanear: si existía otro feder linkeado a este user, eliminarlo
          await qi.sequelize.query(`
            DELETE FROM "Feder" WHERE user_id=:u AND id<>:keep
          `, { transaction: t, replacements: { u: user_id, keep: keep.id } });

          fedIdByUser[user_id] = keep.id;
          continue;
        }

        // B) Si ya existe por user → backfill de avatar (sin pisar si ya hay)
        if (byUser.has(user_id)) {
          const f = byUser.get(user_id);
          fedIdByUser[user_id] = f.id;
          await qi.sequelize.query(
            `UPDATE "Feder"
                SET avatar_url = COALESCE(:avatar, avatar_url),
                    updated_at = :now
              WHERE id = :id`,
            { transaction: t, replacements: { id: f.id, avatar: avatar_url, now } }
          );
          continue;
        }

        // C) Crear feder nuevo con avatar
        const [ins] = await qi.bulkInsert('Feder', [{
          user_id, estado_id: estFed.id,
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


      // ==================================================================================
      // === CHAT: canales y bienvenida ===================================================
      // ==================================================================================
      // Requisitos
      const [[ctCanal]] = await qi.sequelize.query(`SELECT id FROM "ChatCanalTipo" WHERE codigo='canal'  LIMIT 1`, { transaction: t });
      const [[ctCliente]] = await qi.sequelize.query(`SELECT id FROM "ChatCanalTipo" WHERE codigo='cliente' LIMIT 1`, { transaction: t });
      const [[rtOwner]] = await qi.sequelize.query(`SELECT id FROM "ChatRolTipo"   WHERE codigo='owner'  LIMIT 1`, { transaction: t });
      const [[rtAdmin]] = await qi.sequelize.query(`SELECT id FROM "ChatRolTipo"   WHERE codigo='admin'  LIMIT 1`, { transaction: t });
      const [[rtMember]] = await qi.sequelize.query(`SELECT id FROM "ChatRolTipo"   WHERE codigo='member' LIMIT 1`, { transaction: t });

      if (!ctCanal?.id || !rtOwner?.id || !rtMember?.id) {
        throw new Error('Faltan catálogos de chat (0013-chat-catalogs).');
      }
      if (!sistemasUserId) throw new Error('Falta usuario sistemas@fedesconsultora.com (0005).');

      async function ensureChannel({ tipo_id, slug, nombre, topic = null, is_privado = false, only_mods_can_post = false, slowmode_seconds = 0, celula_id = null, cliente_id = null }) {
        const [[exists]] = await qi.sequelize.query(
          `SELECT id FROM "ChatCanal" WHERE slug=:slug LIMIT 1`,
          { transaction: t, replacements: { slug } }
        );
        if (exists?.id) {
          await qi.sequelize.query(
            `UPDATE "ChatCanal" SET nombre=:nombre, topic=:topic, updated_at=:now WHERE id=:id`,
            { transaction: t, replacements: { id: exists.id, nombre, topic, now } }
          );
          return exists.id;
        }

        await qi.bulkInsert('ChatCanal', [{
          tipo_id, slug, nombre, topic,
          descripcion: null,
          is_privado, is_archivado: false,
          only_mods_can_post, slowmode_seconds,
          cliente_id,
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
        { slug: 'general', nombre: '#Feders', tipo_id: ctCanal.id, topic: 'Bienvenidos al chat general de Feders', is_privado: false, only_mods_can_post: false },
        { slug: 'anuncios', nombre: '#FedesHub', tipo_id: ctCanal.id, topic: 'Anuncios internos (solo directorio publica)', is_privado: false, only_mods_can_post: true },
      ];
      const canalIds = {};
      for (const c of canalesDef) {
        canalIds[c.slug] = await ensureChannel(c);
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
        for (const uId of audienceUserIds) {
          // Si el usuario es NivelA o NivelB, hacerlo admin del canal
          const person = PEOPLE.find(p => uid[p.email] === uId);
          const rolInCanal = (person?.nivel === 'NivelA' || person?.nivel === 'NivelB') ? rtAdmin.id : rtMember.id;

          await ensureMember(cid, uId, rolInCanal);
        }
      }


      // ---- Mensajes de bienvenida (pinned) ----
      await ensureWelcomeMessage(canalIds['general'], '👋 ¡Bienvenidos a #general! Usen este canal para discusiones transversales.');
      if (canalIds['anuncios']) {
        await ensureWelcomeMessage(canalIds['anuncios'], '📣 Canal de anuncios internos. Sólo el staff puede publicar aquí.');
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
          `DELETE FROM "UserRol" WHERE user_id IN (:ids)`,
          { transaction: t, replacements: { ids: uids } }
        );
      }
      // No borramos canales ni mensajes (datos de trabajo)
      await t.commit();
    } catch (e) { await t.rollback(); throw e; }
  }
};
