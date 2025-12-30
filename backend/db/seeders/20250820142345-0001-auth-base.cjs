// auth-base 0001

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const bulkInsertIfNotExists = async (table, data, key = 'codigo') => {
      const keys = data.map(d => d[key]);
      const existing = await queryInterface.sequelize.query(
        `SELECT ${key} FROM "${table}" WHERE ${key} IN (:keys)`,
        { replacements: { keys }, type: Sequelize.QueryTypes.SELECT }
      );
      const existingKeys = new Set(existing.map(e => e[key]));
      const toInsert = data.filter(d => !existingKeys.has(d[key]));
      if (toInsert.length > 0) {
        await queryInterface.bulkInsert(table, toInsert, {});
      }
    };

    // ---- RolTipo
    await bulkInsertIfNotExists('RolTipo', [
      { codigo: 'system', nombre: 'Sistema', descripcion: 'Roles del sistema', created_at: now, updated_at: now },
      { codigo: 'custom', nombre: 'Personalizado', descripcion: 'Roles definidos por la organización', created_at: now, updated_at: now },
    ]);

    // ---- Módulos
    const modulos = [
      ['auth', 'Autenticación y Accesos'],
      ['cargos', 'Cargos y ámbitos'],
      ['feders', 'Personas (Feders)'],
      ['asistencia', 'Asistencia'],
      ['ausencias', 'Ausencias'],
      ['celulas', 'Células'],
      ['clientes', 'Clientes'],
      ['tareas', 'Tareas'],
      ['calendario', 'Calendario'],
      ['notificaciones', 'Notificaciones'],
      ['chat', 'Chat']
    ].map(([codigo, nombre]) => ({
      codigo, nombre,
      descripcion: null, created_at: now, updated_at: now
    }));
    await bulkInsertIfNotExists('Modulo', modulos);

    // ---- Acciones
    const acciones = [
      ['read', 'Ver/Consultar'],
      ['create', 'Crear'],
      ['update', 'Editar'],
      ['delete', 'Eliminar'],
      ['approve', 'Aprobar'],
      ['assign', 'Asignar'],
      ['report', 'Reportes/Indicadores']
    ].map(([codigo, nombre]) => ({
      codigo, nombre, descripcion: null, created_at: now, updated_at: now
    }));
    await bulkInsertIfNotExists('Accion', acciones);

    // ---- Roles: 3 niveles jerárquicos
    const existing = await queryInterface.sequelize.query(
      `SELECT id, codigo FROM "RolTipo"`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const rolTipoRows = existing;
    const rolTipoMap = Object.fromEntries(rolTipoRows.map(r => [r.codigo, r.id]));

    const roles = [
      ['NivelA', 'Administrador - Acceso total al sistema'],
      ['NivelB', 'Líder - Acceso intermedio con aprobaciones'],
      ['NivelC', 'Colaborador - Acceso básico'],
    ].map(([nombre, desc]) => ({
      nombre,
      descripcion: desc,
      rol_tipo_id: rolTipoMap['system'],
      created_at: now,
      updated_at: now
    }));
    await bulkInsertIfNotExists('Rol', roles, 'nombre');

    // ---- Dominios de email permitidos
    const dominios = [{ dominio: 'fedes.ai', is_activo: true, created_at: now, updated_at: now }];
    await bulkInsertIfNotExists('AuthEmailDominio', dominios, 'dominio');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('AuthEmailDominio', null, {});
    await queryInterface.bulkDelete('Rol', null, {});
    await queryInterface.bulkDelete('Accion', null, {});
    await queryInterface.bulkDelete('Modulo', null, {});
    await queryInterface.bulkDelete('RolTipo', null, {});
  }
};