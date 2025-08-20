'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();

    // === 1) Dominio de email (asegurar que exista) ===
    let [[dom]] = await queryInterface.sequelize.query(`
      SELECT id FROM "AuthEmailDominio" WHERE dominio='fedes.ai' LIMIT 1
    `);
    if (!dom) {
      await queryInterface.bulkInsert('AuthEmailDominio', [
        { dominio: 'fedes.ai', is_activo: true, created_at: now, updated_at: now }
      ], {});
      [[dom]] = await queryInterface.sequelize.query(`
        SELECT id FROM "AuthEmailDominio" WHERE dominio='fedes.ai' LIMIT 1
      `);
    }
    const emailDomId = dom.id;

    // === 2) Usuarios base (solo estos 4) ===
    await queryInterface.bulkInsert('User', [
      { email: 'sistemas@fedes.ai',  password_hash: 'changeme', is_activo: true, email_dominio_id: emailDomId, created_at: now, updated_at: now },
      { email: 'ralbanesi@fedes.ai', password_hash: 'changeme', is_activo: true, email_dominio_id: emailDomId, created_at: now, updated_at: now },
      { email: 'epinotti@fedes.ai',  password_hash: 'changeme', is_activo: true, email_dominio_id: emailDomId, created_at: now, updated_at: now },
      { email: 'gcanibano@fedes.ai', password_hash: 'changeme', is_activo: true, email_dominio_id: emailDomId, created_at: now, updated_at: now },
    ], {});

    const [users] = await queryInterface.sequelize.query(`
      SELECT id, email FROM "User"
      WHERE email IN ('sistemas@fedes.ai','ralbanesi@fedes.ai','epinotti@fedes.ai','gcanibano@fedes.ai')
    `);
    const uid = Object.fromEntries(users.map(u => [u.email, u.id]));

    // === 3) Célula Core ===
    const [[celulaEstadoActiva]] = await queryInterface.sequelize.query(`
      SELECT id FROM "CelulaEstado" WHERE codigo='activa' LIMIT 1
    `);
    await queryInterface.bulkInsert('Celula', [
      { nombre: 'Core', descripcion: 'Célula principal', estado_id: celulaEstadoActiva.id, created_at: now, updated_at: now }
    ], {});
    const [[celulaCore]] = await queryInterface.sequelize.query(`
      SELECT id FROM "Celula" WHERE nombre='Core' LIMIT 1
    `);

    // === 4) Feders (uno por cada user) ===
    const [[federActivo]] = await queryInterface.sequelize.query(`
      SELECT id FROM "FederEstadoTipo" WHERE codigo='activo' LIMIT 1
    `);

    await queryInterface.bulkInsert('Feder', [
      { user_id: uid['sistemas@fedes.ai'],  celula_id: celulaCore.id, estado_id: federActivo.id, nombre: 'Sistemas', apellido: 'Fedes', is_activo: true, created_at: now, updated_at: now },
      { user_id: uid['ralbanesi@fedes.ai'], celula_id: celulaCore.id, estado_id: federActivo.id, nombre: 'Romina',  apellido: 'Albanesi', is_activo: true, created_at: now, updated_at: now },
      { user_id: uid['epinotti@fedes.ai'],  celula_id: celulaCore.id, estado_id: federActivo.id, nombre: 'Enzo',     apellido: 'Pinotti',  is_activo: true, created_at: now, updated_at: now },
      { user_id: uid['gcanibano@fedes.ai'], celula_id: celulaCore.id, estado_id: federActivo.id, nombre: 'Gonzalo',  apellido: 'Canibano', is_activo: true, created_at: now, updated_at: now },
    ], {});
    const [feders] = await queryInterface.sequelize.query(`
      SELECT id, user_id FROM "Feder"
      WHERE user_id IN (${uid['sistemas@fedes.ai']},${uid['ralbanesi@fedes.ai']},${uid['epinotti@fedes.ai']},${uid['gcanibano@fedes.ai']})
    `);
    const federByUserId = Object.fromEntries(feders.map(f => [f.user_id, f.id]));

    // === 5) Calendarios personales (todos pueden crear eventos) ===
    const [[calPersonal]] = await queryInterface.sequelize.query(`
      SELECT id FROM "CalendarioTipo" WHERE codigo='personal' LIMIT 1
    `);
    const [[visPriv]] = await queryInterface.sequelize.query(`
      SELECT id FROM "VisibilidadTipo" WHERE codigo='privado' LIMIT 1
    `);

    await queryInterface.bulkInsert('CalendarioLocal', [
      { tipo_id: calPersonal.id, nombre: 'Calendario de Sistemas',  visibilidad_id: visPriv.id, feder_id: federByUserId[uid['sistemas@fedes.ai']],  celula_id: null, cliente_id: null, time_zone: 'America/Argentina/Buenos_Aires', color: '#1e88e5', is_activo: true, created_at: now, updated_at: now },
      { tipo_id: calPersonal.id, nombre: 'Calendario de Romina',    visibilidad_id: visPriv.id, feder_id: federByUserId[uid['ralbanesi@fedes.ai']], celula_id: null, cliente_id: null, time_zone: 'America/Argentina/Buenos_Aires', color: '#8e24aa', is_activo: true, created_at: now, updated_at: now },
      { tipo_id: calPersonal.id, nombre: 'Calendario de Enzo',      visibilidad_id: visPriv.id, feder_id: federByUserId[uid['epinotti@fedes.ai']],  celula_id: null, cliente_id: null, time_zone: 'America/Argentina/Buenos_Aires', color: '#43a047', is_activo: true, created_at: now, updated_at: now },
      { tipo_id: calPersonal.id, nombre: 'Calendario de Gonzalo',   visibilidad_id: visPriv.id, feder_id: federByUserId[uid['gcanibano@fedes.ai']], celula_id: null, cliente_id: null, time_zone: 'America/Argentina/Buenos_Aires', color: '#f4511e', is_activo: true, created_at: now, updated_at: now },
    ], {});

    // === 6) Cliente demo (para tareas iniciales si hace falta) ===
    const [[cliTipoA]] = await queryInterface.sequelize.query(`
      SELECT id, ponderacion FROM "ClienteTipo" WHERE codigo='A' LIMIT 1
    `);
    const [[cliEstadoAct]] = await queryInterface.sequelize.query(`
      SELECT id FROM "ClienteEstado" WHERE codigo='activo' LIMIT 1
    `);
    await queryInterface.bulkInsert('Cliente', [{
      celula_id: celulaCore.id, tipo_id: cliTipoA.id, estado_id: cliEstadoAct.id,
      nombre: 'Cliente Demo', alias: 'Demo', email: 'contacto@demo.com',
      telefono: '+54 11 1234-5678', sitio_web: 'https://demo.com',
      descripcion: 'Cliente semilla', ponderacion: cliTipoA.ponderacion,
      created_at: now, updated_at: now
    }], {});

    // === 7) Asignación de roles a los 4 usuarios ===
    const [roles] = await queryInterface.sequelize.query(`SELECT id, nombre FROM "Rol"`);
    const rid = Object.fromEntries(roles.map(r => [r.nombre, r.id]));

    const userRolRows = [
      uid['sistemas@fedes.ai']  ? { user_id: uid['sistemas@fedes.ai'],  rol_id: rid['Admin'],            created_at: now } : null,
      uid['ralbanesi@fedes.ai'] ? { user_id: uid['ralbanesi@fedes.ai'], rol_id: rid['RRHH'],             created_at: now } : null,
      uid['gcanibano@fedes.ai'] ? { user_id: uid['gcanibano@fedes.ai'], rol_id: rid['CuentasAnalista'],  created_at: now } : null,
      uid['epinotti@fedes.ai']  ? { user_id: uid['epinotti@fedes.ai'],  rol_id: rid['Feder'],            created_at: now } : null,
    ].filter(Boolean);

    if (userRolRows.length) {
      await queryInterface.bulkInsert('UserRol', userRolRows, {});
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('UserRol', null, {});
    await queryInterface.bulkDelete('CalendarioLocal', null, {});
    await queryInterface.bulkDelete('Cliente', null, {});
    await queryInterface.bulkDelete('Feder', null, {});
    await queryInterface.bulkDelete('Celula', { nombre: 'Core' }, {});
    await queryInterface.bulkDelete('User', {
      email: ['sistemas@fedes.ai','ralbanesi@fedes.ai','epinotti@fedes.ai','gcanibano@fedes.ai']
    }, {});
    // No borramos el dominio ni catálogos
  }
};
