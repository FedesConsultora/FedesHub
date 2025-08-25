// backend/db/seeders/20250820143036-0005-sample-initial-data.cjs
'use strict';
/**
 * Seeder 0200 - sample-initial-data
 * Crea dominio, 4 usuarios, célula Core (con slug requerido), feders,
 * calendarios personales y un cliente demo.
 * Compatible con el nuevo esquema de Células (slug NOT NULL, perfil_md, avatar/cover).
 */

module.exports = {
  async up (queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction();
    try {
      const now = new Date();

      const slugify = (s) =>
        (s || '')
          .toString()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .toLowerCase().trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

      // === 1) Dominio ===
      let [[dom]] = await queryInterface.sequelize.query(
        `SELECT id FROM "AuthEmailDominio" WHERE dominio='fedes.ai' LIMIT 1`, { transaction: t }
      );
      if (!dom) {
        await queryInterface.bulkInsert('AuthEmailDominio', [
          { dominio: 'fedes.ai', is_activo: true, created_at: now, updated_at: now }
        ], { transaction: t });
        [[dom]] = await queryInterface.sequelize.query(
          `SELECT id FROM "AuthEmailDominio" WHERE dominio='fedes.ai' LIMIT 1`, { transaction: t }
        );
      }
      const emailDomId = dom.id;

      // === 2) Usuarios base (idempotente) ===
      const usersToInsert = [
        'sistemas@fedes.ai', 'ralbanesi@fedes.ai', 'epinotti@fedes.ai', 'gcanibano@fedes.ai'
      ];
      const [existingUsers] = await queryInterface.sequelize.query(
        `SELECT email FROM "User" WHERE email IN (:emails)`,
        { transaction: t, replacements: { emails: usersToInsert } }
      );
      const existingSet = new Set(existingUsers.map(u => u.email));
      const missingUsers = usersToInsert.filter(e => !existingSet.has(e)).map(email => ({
        email, password_hash: 'changeme', is_activo: true,
        email_dominio_id: emailDomId, created_at: now, updated_at: now
      }));
      if (missingUsers.length) {
        await queryInterface.bulkInsert('User', missingUsers, { transaction: t });
      }

      const [users] = await queryInterface.sequelize.query(
        `SELECT id, email FROM "User"
         WHERE email IN ('sistemas@fedes.ai','ralbanesi@fedes.ai','epinotti@fedes.ai','gcanibano@fedes.ai')`,
        { transaction: t }
      );
      const uid = Object.fromEntries(users.map(u => [u.email, u.id]));

      // === 3) Célula Core (con slug y perfil_md) ===
      const [[celulaEstadoActiva]] = await queryInterface.sequelize.query(
        `SELECT id FROM "CelulaEstado" WHERE codigo='activa' LIMIT 1`,
        { transaction: t }
      );

      const coreName = 'Core';
      const coreSlug = slugify(coreName);

      // Busca por slug o por nombre (por si la migración 0161 generó slug tipo "core-1")
      const [[celExist]] = await queryInterface.sequelize.query(
        `SELECT id FROM "Celula" WHERE slug = :slug OR nombre = :name LIMIT 1`,
        { transaction: t, replacements: { slug: coreSlug, name: coreName } }
      );

      let celulaCoreId;
      if (!celExist) {
        await queryInterface.bulkInsert('Celula', [{
          nombre: coreName,
          descripcion: 'Célula principal',
          estado_id: celulaEstadoActiva.id,
          slug: coreSlug,
          avatar_url: null,
          cover_url: null,
          perfil_md: null,        // <<<<<< CORREGIDO (antes era "perfil")
          created_at: now,
          updated_at: now
        }], { transaction: t });
        const [[cel]] = await queryInterface.sequelize.query(
          `SELECT id FROM "Celula" WHERE slug = :slug LIMIT 1`,
          { transaction: t, replacements: { slug: coreSlug } }
        );
        celulaCoreId = cel.id;
      } else {
        celulaCoreId = celExist.id;
      }

      // === 4) Feders (idempotente) ===
      const [[federActivo]] = await queryInterface.sequelize.query(
        `SELECT id FROM "FederEstadoTipo" WHERE codigo='activo' LIMIT 1`,
        { transaction: t }
      );
      const [existingFeders] = await queryInterface.sequelize.query(
        `SELECT user_id FROM "Feder" WHERE user_id IN (:uids)`,
        { transaction: t, replacements: { uids: Object.values(uid) } }
      );
      const fedSet = new Set(existingFeders.map(f => f.user_id));
      const fedRows = [
        { user_id: uid['sistemas@fedes.ai'],  nombre: 'Sistemas', apellido: 'Fedes' },
        { user_id: uid['ralbanesi@fedes.ai'], nombre: 'Romina',   apellido: 'Albanesi' },
        { user_id: uid['epinotti@fedes.ai'],  nombre: 'Enzo',     apellido: 'Pinotti' },
        { user_id: uid['gcanibano@fedes.ai'], nombre: 'Gonzalo',  apellido: 'Canibano' },
      ].filter(r => r.user_id && !fedSet.has(r.user_id))
       .map(r => ({
         ...r, celula_id: celulaCoreId, estado_id: federActivo.id,
         is_activo: true, created_at: now, updated_at: now
       }));
      if (fedRows.length) {
        await queryInterface.bulkInsert('Feder', fedRows, { transaction: t });
      }

      const [feders] = await queryInterface.sequelize.query(
        `SELECT id, user_id FROM "Feder" WHERE user_id IN (:uids)`,
        { transaction: t, replacements: { uids: Object.values(uid) } }
      );
      const federByUserId = Object.fromEntries(feders.map(f => [f.user_id, f.id]));

      // === 5) Calendarios personales (idempotente) ===
      const [[calPersonal]] = await queryInterface.sequelize.query(
        `SELECT id FROM "CalendarioTipo" WHERE codigo='personal' LIMIT 1`, { transaction: t }
      );
      const [[visPriv]] = await queryInterface.sequelize.query(
        `SELECT id FROM "VisibilidadTipo" WHERE codigo='privado' LIMIT 1`, { transaction: t }
      );
      const calToEnsure = [
        { name: 'Calendario de Sistemas',  user: 'sistemas@fedes.ai',  color: '#1e88e5' },
        { name: 'Calendario de Romina',    user: 'ralbanesi@fedes.ai', color: '#8e24aa' },
        { name: 'Calendario de Enzo',      user: 'epinotti@fedes.ai',  color: '#43a047' },
        { name: 'Calendario de Gonzalo',   user: 'gcanibano@fedes.ai', color: '#f4511e' },
      ];
      for (const c of calToEnsure) {
        const federId = federByUserId[uid[c.user]];
        if (!federId) continue;
        const [[existsCal]] = await queryInterface.sequelize.query(
          `SELECT id FROM "CalendarioLocal"
           WHERE tipo_id = :tipo AND feder_id = :fid AND nombre = :name LIMIT 1`,
          { transaction: t, replacements: { tipo: calPersonal.id, fid: federId, name: c.name } }
        );
        if (!existsCal) {
          await queryInterface.bulkInsert('CalendarioLocal', [{
            tipo_id: calPersonal.id,
            nombre: c.name,
            visibilidad_id: visPriv.id,
            feder_id: federId,
            celula_id: null,
            cliente_id: null,
            time_zone: 'America/Argentina/Buenos_Aires',
            color: c.color,
            is_activo: true,
            created_at: now,
            updated_at: now
          }], { transaction: t });
        }
      }

      // === 6) Cliente demo (idempotente) ===
      const [[cliTipoA]] = await queryInterface.sequelize.query(
        `SELECT id, ponderacion FROM "ClienteTipo" WHERE codigo='A' LIMIT 1`, { transaction: t }
      );
      const [[cliEstadoAct]] = await queryInterface.sequelize.query(
        `SELECT id FROM "ClienteEstado" WHERE codigo='activo' LIMIT 1`, { transaction: t }
      );
      const [[clienteDemoExists]] = await queryInterface.sequelize.query(
        `SELECT id FROM "Cliente" WHERE nombre='Cliente Demo' LIMIT 1`, { transaction: t }
      );
      if (!clienteDemoExists) {
        await queryInterface.bulkInsert('Cliente', [{
          celula_id: celulaCoreId, tipo_id: cliTipoA.id, estado_id: cliEstadoAct.id,
          nombre: 'Cliente Demo', alias: 'Demo', email: 'contacto@demo.com',
          telefono: '+54 11 1234-5678', sitio_web: 'https://demo.com',
          descripcion: 'Cliente semilla', ponderacion: cliTipoA.ponderacion,
          created_at: now, updated_at: now
        }], { transaction: t });
      }

      // === 7) Roles (idempotente) ===
      const [roles] = await queryInterface.sequelize.query(
        `SELECT id, nombre FROM "Rol"`, { transaction: t }
      );
      const rid = Object.fromEntries(roles.map(r => [r.nombre, r.id]));
      const toAssign = [
        ['sistemas@fedes.ai', 'Admin'],
        ['ralbanesi@fedes.ai','RRHH'],
        ['gcanibano@fedes.ai','CuentasAnalista'],
        ['epinotti@fedes.ai', 'Feder'],
      ].map(([email, rol]) => ({ user_id: uid[email], rol_id: rid[rol] }))
       .filter(r => r.user_id && r.rol_id);
      if (toAssign.length) {
        const pairs = toAssign.map(r => `(${r.user_id},${r.rol_id})`).join(',');
        const [already] = await queryInterface.sequelize.query(
          `SELECT user_id, rol_id FROM "UserRol" WHERE (user_id, rol_id) IN (${pairs})`,
          { transaction: t }
        );
        const existSet = new Set(already.map(a => `${a.user_id}:${a.rol_id}`));
        const missing = toAssign
          .filter(a => !existSet.has(`${a.user_id}:${a.rol_id}`))
          .map(a => ({ ...a, created_at: now }));
        if (missing.length) {
          await queryInterface.bulkInsert('UserRol', missing, { transaction: t });
        }
      }

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async down (queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.bulkDelete('UserRol', null, { transaction: t });
      await queryInterface.bulkDelete('CalendarioLocal', null, { transaction: t });
      await queryInterface.bulkDelete('Cliente', { nombre: 'Cliente Demo' }, { transaction: t });
      await queryInterface.bulkDelete('Feder', null, { transaction: t });
      await queryInterface.bulkDelete('Celula', { slug: 'core' }, { transaction: t });
      await queryInterface.bulkDelete('User', {
        email: ['sistemas@fedes.ai','ralbanesi@fedes.ai','epinotti@fedes.ai','gcanibano@fedes.ai']
      }, { transaction: t });

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }
};
