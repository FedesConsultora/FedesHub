// backend/db/seeders/202508200100-0003-core-catalogs.cjs
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const bulkInsertIfNotExists = async (table, data) => {
      const codes = data.map(d => d.codigo);
      const existing = await queryInterface.sequelize.query(
        `SELECT codigo FROM "${table}" WHERE codigo IN (:codes)`,
        { replacements: { codes }, type: Sequelize.QueryTypes.SELECT }
      );
      const existingCodes = new Set(existing.map(e => e.codigo));
      const toInsert = data.filter(d => !existingCodes.has(d.codigo));
      if (toInsert.length > 0) {
        await queryInterface.bulkInsert(table, toInsert, {});
      }
    };

    // ===== CARGOS
    await bulkInsertIfNotExists('CargoAmbito', [
      { codigo: 'organico', nombre: 'Orgánico', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'cliente', nombre: 'Cliente', descripcion: null, created_at: now, updated_at: now },
    ]);

    // ===== FEDERS
    await bulkInsertIfNotExists('FederEstadoTipo', [
      { codigo: 'activo', nombre: 'Activo', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'licencia', nombre: 'En licencia', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'inactivo', nombre: 'Inactivo', descripcion: null, created_at: now, updated_at: now },
    ]);

    await bulkInsertIfNotExists('ModalidadTrabajoTipo', [
      { codigo: 'remoto', nombre: 'Remoto', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'hibrido', nombre: 'Híbrido', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'oficina', nombre: 'Oficina', descripcion: null, created_at: now, updated_at: now },
    ]);

    // DiaSemana usa ID fijo, manejo especial
    const existingDias = await queryInterface.sequelize.query(`SELECT id FROM "DiaSemana"`, { type: Sequelize.QueryTypes.SELECT });
    const diaIds = new Set(existingDias.map(d => d.id));
    const dias = [
      { id: 1, codigo: 'lun', nombre: 'Lunes' },
      { id: 2, codigo: 'mar', nombre: 'Martes' },
      { id: 3, codigo: 'mie', nombre: 'Miércoles' },
      { id: 4, codigo: 'jue', nombre: 'Jueves' },
      { id: 5, codigo: 'vie', nombre: 'Viernes' },
      { id: 6, codigo: 'sab', nombre: 'Sábado' },
      { id: 7, codigo: 'dom', nombre: 'Domingo' },
    ].filter(d => !diaIds.has(d.id));
    if (dias.length > 0) await queryInterface.bulkInsert('DiaSemana', dias, {});

    // ===== CÉLULAS
    await bulkInsertIfNotExists('CelulaEstado', [
      { codigo: 'activa', nombre: 'Activa', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'pausada', nombre: 'Pausada', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'cerrada', nombre: 'Cerrada', descripcion: null, created_at: now, updated_at: now },
    ]);

    await bulkInsertIfNotExists('CelulaRolTipo', [
      { codigo: 'producto', nombre: 'Producto', descripcion: 'Tridente de valor', created_at: now, updated_at: now },
      { codigo: 'tecnologia', nombre: 'Tecnología', descripcion: 'Tridente de valor', created_at: now, updated_at: now },
      { codigo: 'operaciones', nombre: 'Operaciones', descripcion: 'Tridente de valor', created_at: now, updated_at: now },
      { codigo: 'miembro', nombre: 'Miembro', descripcion: null, created_at: now, updated_at: now },
    ]);

    // ===== CLIENTES
    await bulkInsertIfNotExists('ClienteTipo', [
      { codigo: 'A', nombre: 'Tipo A', ponderacion: 5, descripcion: null, created_at: now, updated_at: now },
      { codigo: 'B', nombre: 'Tipo B', ponderacion: 3, descripcion: null, created_at: now, updated_at: now },
      { codigo: 'C', nombre: 'Tipo C', ponderacion: 1, descripcion: null, created_at: now, updated_at: now },
    ]);

    await bulkInsertIfNotExists('ClienteEstado', [
      { codigo: 'activo', nombre: 'Activo', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'pausado', nombre: 'Pausado', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'baja', nombre: 'Baja', descripcion: null, created_at: now, updated_at: now },
    ]);

    // ===== TAREAS
    await bulkInsertIfNotExists('TareaEstado', [
      { codigo: 'pendiente', nombre: 'Pendiente', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'en_curso', nombre: 'En curso', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'revision', nombre: 'Revisión', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'aprobada', nombre: 'Aprobada', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'cancelada', nombre: 'Cancelada', descripcion: null, created_at: now, updated_at: now }
    ]);

    await bulkInsertIfNotExists('ImpactoTipo', [
      { codigo: 'alto', nombre: 'Alto', puntos: 30, descripcion: null, created_at: now, updated_at: now },
      { codigo: 'medio', nombre: 'Medio', puntos: 15, descripcion: null, created_at: now, updated_at: now },
      { codigo: 'bajo', nombre: 'Bajo', puntos: 0, descripcion: null, created_at: now, updated_at: now },
    ]);

    await bulkInsertIfNotExists('UrgenciaTipo', [
      { codigo: 'lt_24h', nombre: 'Menos de 24h', puntos: 30, created_at: now, updated_at: now },
      { codigo: 'lt_72h', nombre: 'Menos de 72h', puntos: 20, created_at: now, updated_at: now },
      { codigo: 'lt_7d', nombre: 'Menos de 7 días', puntos: 10, created_at: now, updated_at: now },
      { codigo: 'gte_7d', nombre: '7 días o más', puntos: 0, created_at: now, updated_at: now },
    ]);

    await bulkInsertIfNotExists('ComentarioTipo', [
      { codigo: 'sugerencia', nombre: 'Sugerencia', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'correccion', nombre: 'Corrección', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'nota', nombre: 'Nota', descripcion: null, created_at: now, updated_at: now },
    ]);

    await bulkInsertIfNotExists('TareaAprobacionEstado', [
      { codigo: 'no_aplica', nombre: 'No aplica', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'pendiente', nombre: 'Pendiente', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'aprobada', nombre: 'Aprobada', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'rechazada', nombre: 'Rechazada', descripcion: null, created_at: now, updated_at: now },
    ]);

    // ===== ASISTENCIA
    await bulkInsertIfNotExists('AsistenciaOrigenTipo', [
      { codigo: 'manual', nombre: 'Manual', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'web', nombre: 'Web', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'app', nombre: 'App', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'auto', nombre: 'Automático', descripcion: null, created_at: now, updated_at: now },
    ]);

    await bulkInsertIfNotExists('AsistenciaCierreMotivoTipo', [
      { codigo: 'olvido_checkout', nombre: 'Olvido de Check-out', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'cierre_admin', nombre: 'Cierre por Admin', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'fin_jornada', nombre: 'Fin de Jornada', descripcion: null, created_at: now, updated_at: now },
    ]);

    // ===== CALENDARIO
    await bulkInsertIfNotExists('CalendarioTipo', [
      { codigo: 'personal', nombre: 'Personal', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'celula', nombre: 'Célula', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'cliente', nombre: 'Cliente', descripcion: null, created_at: now, updated_at: now },
    ]);

    await bulkInsertIfNotExists('VisibilidadTipo', [
      { codigo: 'privado', nombre: 'Privado', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'equipo', nombre: 'Equipo', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'organizacion', nombre: 'Organización', descripcion: null, created_at: now, updated_at: now },
    ]);

    await bulkInsertIfNotExists('EventoTipo', [
      { codigo: 'reunion', nombre: 'Reunión', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'bloqueo', nombre: 'Bloqueo', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'tarea', nombre: 'Tarea', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'otro', nombre: 'Otro', descripcion: null, created_at: now, updated_at: now },
    ]);

    await bulkInsertIfNotExists('SyncDireccionTipo', [
      { codigo: 'local_a_google', nombre: 'Sólo local → Google', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'google_a_local', nombre: 'Sólo Google → local', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'bidireccional', nombre: 'Bidireccional', descripcion: null, created_at: now, updated_at: now },
    ]);

    await bulkInsertIfNotExists('AsistenteTipo', [
      { codigo: 'obligatorio', nombre: 'Obligatorio', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'opcional', nombre: 'Opcional', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'informativo', nombre: 'Informativo', descripcion: null, created_at: now, updated_at: now },
    ]);

    // ===== NOTIFICACIONES (SOLO catálogos que NO dependen de buzon_id)
    await bulkInsertIfNotExists('CanalTipo', [
      { codigo: 'in_app', nombre: 'In-App', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'email', nombre: 'Email', descripcion: null, created_at: now, updated_at: now },
    ]);

    await bulkInsertIfNotExists('ImportanciaTipo', [
      { codigo: 'alta', nombre: 'Alta', orden: 1, created_at: now, updated_at: now },
      { codigo: 'media', nombre: 'Media', orden: 2, created_at: now, updated_at: now },
      { codigo: 'baja', nombre: 'Baja', orden: 3, created_at: now, updated_at: now },
    ]);

    await bulkInsertIfNotExists('EstadoEnvio', [
      { codigo: 'queued', nombre: 'En cola', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'sent', nombre: 'Enviado', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'delivered', nombre: 'Entregado', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'opened', nombre: 'Abierto', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'read', nombre: 'Leído', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'failed', nombre: 'Fallido', descripcion: null, created_at: now, updated_at: now },
    ]);

    await bulkInsertIfNotExists('ProveedorTipo', [
      { codigo: 'smtp', nombre: 'SMTP', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'firebase', nombre: 'Firebase', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'sendgrid', nombre: 'SendGrid', descripcion: null, created_at: now, updated_at: now },
    ]);
  },

  async down(queryInterface) {
    // Nota: NO borramos NotificacionTipo aquí (lo crea/borra el seeder 0300)
    await queryInterface.bulkDelete('ProveedorTipo', null, {});
    await queryInterface.bulkDelete('EstadoEnvio', null, {});
    await queryInterface.bulkDelete('ImportanciaTipo', null, {});
    await queryInterface.bulkDelete('CanalTipo', null, {});

    await queryInterface.bulkDelete('AsistenteTipo', null, {});
    await queryInterface.bulkDelete('SyncDireccionTipo', null, {});
    await queryInterface.bulkDelete('EventoTipo', null, {});
    await queryInterface.bulkDelete('VisibilidadTipo', null, {});
    await queryInterface.bulkDelete('CalendarioTipo', null, {});

    await queryInterface.bulkDelete('AsistenciaCierreMotivoTipo', null, {});
    await queryInterface.bulkDelete('AsistenciaOrigenTipo', null, {});

    await queryInterface.bulkDelete('TareaAprobacionEstado', null, {});
    await queryInterface.bulkDelete('ComentarioTipo', null, {});
    await queryInterface.bulkDelete('UrgenciaTipo', null, {});
    await queryInterface.bulkDelete('ImpactoTipo', null, {});
    await queryInterface.bulkDelete('TareaEstado', null, {});

    await queryInterface.bulkDelete('ClienteEstado', null, {});
    await queryInterface.bulkDelete('ClienteTipo', null, {});

    await queryInterface.bulkDelete('CelulaRolTipo', null, {});
    await queryInterface.bulkDelete('CelulaEstado', null, {});

    await queryInterface.bulkDelete('DiaSemana', null, {});
    await queryInterface.bulkDelete('ModalidadTrabajoTipo', null, {});
    await queryInterface.bulkDelete('FederEstadoTipo', null, {});
    await queryInterface.bulkDelete('CargoAmbito', null, {});
  }
};
