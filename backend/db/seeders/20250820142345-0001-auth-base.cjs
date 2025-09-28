// auth-base 0001

'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();

    // ---- RolTipo
    await queryInterface.bulkInsert('RolTipo', [
      { codigo: 'system', nombre: 'Sistema', descripcion: 'Roles del sistema', created_at: now, updated_at: now },
      { codigo: 'custom', nombre: 'Personalizado', descripcion: 'Roles definidos por la organización', created_at: now, updated_at: now },
    ], {});

    // ---- Módulos
    const modulos = [
      ['auth','Autenticación y Accesos'],
      ['cargos','Cargos y ámbitos'],
      ['feders','Personas (Feders)'],
      ['asistencia','Asistencia'],
      ['ausencias','Ausencias'],
      ['celulas','Células'],
      ['clientes','Clientes'],
      ['tareas','Tareas'],
      ['calendario','Calendario'],
      ['notificaciones','Notificaciones'],
      ['chat','Chat']           // 👈👈👈 AGREGADO
    ].map(([codigo, nombre]) => ({
      codigo, nombre,
      descripcion: null, created_at: now, updated_at: now
    }));
    await queryInterface.bulkInsert('Modulo', modulos, {});

    // ---- Acciones
    const acciones = [
      ['read','Ver/Consultar'],
      ['create','Crear'],
      ['update','Editar'],
      ['delete','Eliminar'],
      ['approve','Aprobar'],
      ['assign','Asignar'],
      ['report','Reportes/Indicadores']
    ].map(([codigo, nombre]) => ({
      codigo, nombre, descripcion: null, created_at: now, updated_at: now
    }));
    await queryInterface.bulkInsert('Accion', acciones, {});

    // ---- Roles (incluye AnalistaComunicacion)
    const [rolTipoRows] = await queryInterface.sequelize.query(`SELECT id, codigo FROM "RolTipo"`);
    const rolTipoMap = Object.fromEntries(rolTipoRows.map(r => [r.codigo, r.id]));
    const roles = [
      ['Admin','Administrador'],
      ['CLevel','Dirección (C-Level)'],
      ['RRHH','Capital Humano'],

      ['AnalistaDiseno','Analista de Diseño'],
      ['CuentasAnalista','Analista de Cuentas'],
      ['AnalistaAudiovisual','Analista Audiovisual'],
      ['AnalistaComunicacion','Analista de Comunicación'],

      ['TriMarketing','Tridente - Marketing'],
      ['TriPerformance','Tridente - Performance'],
      ['TriTecnologia','Tridente - Tecnología'],

      ['Feder','Miembro'],
      ['Onboarding','Onboarding']
    ].map(([nombre, desc]) => ({
      nombre,
      descripcion: desc,
      rol_tipo_id: rolTipoMap['system'],
      created_at: now,
      updated_at: now
    }));
    await queryInterface.bulkInsert('Rol', roles, {});

    // ---- Dominios de email permitidos
    await queryInterface.bulkInsert('AuthEmailDominio', [
      { dominio: 'fedes.ai', is_activo: true, created_at: now, updated_at: now }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('AuthEmailDominio', null, {});
    await queryInterface.bulkDelete('Rol', null, {});
    await queryInterface.bulkDelete('Accion', null, {});
    await queryInterface.bulkDelete('Modulo', null, {});
    await queryInterface.bulkDelete('RolTipo', null, {});
  }
};