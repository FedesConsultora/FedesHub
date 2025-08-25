// backend/db/seeders/202508200100-0003-core-catalogs.cjs
'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();

    // ===== CARGOS
    await queryInterface.bulkInsert('CargoAmbito', [
      { codigo: 'organico', nombre: 'Orgánico', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'cliente',  nombre: 'Cliente',  descripcion: null, created_at: now, updated_at: now },
    ], {});

    // ===== FEDERS
    await queryInterface.bulkInsert('FederEstadoTipo', [
      { codigo: 'activo',   nombre: 'Activo',   descripcion: null, created_at: now, updated_at: now },
      { codigo: 'licencia', nombre: 'En licencia', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'inactivo', nombre: 'Inactivo', descripcion: null, created_at: now, updated_at: now },
    ], {});

    await queryInterface.bulkInsert('ModalidadTrabajoTipo', [
      { codigo: 'remoto',  nombre: 'Remoto',  descripcion: null, created_at: now, updated_at: now },
      { codigo: 'hibrido', nombre: 'Híbrido', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'oficina', nombre: 'Oficina', descripcion: null, created_at: now, updated_at: now },
    ], {});

    await queryInterface.bulkInsert('DiaSemana', [
      { id: 1, codigo: 'lun', nombre: 'Lunes' },
      { id: 2, codigo: 'mar', nombre: 'Martes' },
      { id: 3, codigo: 'mie', nombre: 'Miércoles' },
      { id: 4, codigo: 'jue', nombre: 'Jueves' },
      { id: 5, codigo: 'vie', nombre: 'Viernes' },
      { id: 6, codigo: 'sab', nombre: 'Sábado' },
      { id: 7, codigo: 'dom', nombre: 'Domingo' },
    ], {});

    // ===== CÉLULAS
    await queryInterface.bulkInsert('CelulaEstado', [
      { codigo: 'activa',  nombre: 'Activa',  descripcion: null, created_at: now, updated_at: now },
      { codigo: 'pausada', nombre: 'Pausada', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'cerrada', nombre: 'Cerrada', descripcion: null, created_at: now, updated_at: now },
    ], {});

    await queryInterface.bulkInsert('CelulaRolTipo', [
      { codigo: 'producto',   nombre: 'Producto',   descripcion: 'Tridente de valor', created_at: now, updated_at: now },
      { codigo: 'tecnologia', nombre: 'Tecnología', descripcion: 'Tridente de valor', created_at: now, updated_at: now },
      { codigo: 'operaciones',nombre: 'Operaciones',descripcion: 'Tridente de valor', created_at: now, updated_at: now },
      { codigo: 'miembro',    nombre: 'Miembro',    descripcion: null, created_at: now, updated_at: now },
    ], {});

    // ===== CLIENTES
    await queryInterface.bulkInsert('ClienteTipo', [
      { codigo: 'A', nombre: 'Tipo A', ponderacion: 5, descripcion: null, created_at: now, updated_at: now },
      { codigo: 'B', nombre: 'Tipo B', ponderacion: 3, descripcion: null, created_at: now, updated_at: now },
      { codigo: 'C', nombre: 'Tipo C', ponderacion: 1, descripcion: null, created_at: now, updated_at: now },
    ], {});

    await queryInterface.bulkInsert('ClienteEstado', [
      { codigo: 'activo',  nombre: 'Activo',  descripcion: null, created_at: now, updated_at: now },
      { codigo: 'pausado', nombre: 'Pausado', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'baja',    nombre: 'Baja',    descripcion: null, created_at: now, updated_at: now },
    ], {});

    // ===== TAREAS
    await queryInterface.bulkInsert('TareaEstado', [
      { codigo: 'pendiente', nombre: 'Pendiente', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'en_curso',  nombre: 'En curso',  descripcion: null, created_at: now, updated_at: now },
      { codigo: 'finalizada',nombre: 'Finalizada',descripcion: null, created_at: now, updated_at: now },
      { codigo: 'cancelada', nombre: 'Cancelada', descripcion: null, created_at: now, updated_at: now },
    ], {});

    await queryInterface.bulkInsert('ImpactoTipo', [
      { codigo: 'alto',  nombre: 'Alto',  puntos: 30, descripcion: null, created_at: now, updated_at: now },
      { codigo: 'medio', nombre: 'Medio', puntos: 15, descripcion: null, created_at: now, updated_at: now },
      { codigo: 'bajo',  nombre: 'Bajo',  puntos: 0,  descripcion: null, created_at: now, updated_at: now },
    ], {});

    await queryInterface.bulkInsert('UrgenciaTipo', [
      { codigo: 'lt_24h', nombre: 'Menos de 24h',  puntos: 30, created_at: now, updated_at: now },
      { codigo: 'lt_72h', nombre: 'Menos de 72h',  puntos: 20, created_at: now, updated_at: now },
      { codigo: 'lt_7d',  nombre: 'Menos de 7 días', puntos: 10, created_at: now, updated_at: now },
      { codigo: 'gte_7d', nombre: '7 días o más',   puntos: 0,  created_at: now, updated_at: now },
    ], {});

    await queryInterface.bulkInsert('ComentarioTipo', [
      { codigo: 'sugerencia', nombre: 'Sugerencia', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'correccion', nombre: 'Corrección', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'nota',       nombre: 'Nota',       descripcion: null, created_at: now, updated_at: now },
    ], {});

    await queryInterface.bulkInsert('TareaAprobacionEstado', [
      { codigo: 'no_aplica', nombre: 'No aplica', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'pendiente', nombre: 'Pendiente', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'aprobada',  nombre: 'Aprobada',  descripcion: null, created_at: now, updated_at: now },
      { codigo: 'rechazada', nombre: 'Rechazada', descripcion: null, created_at: now, updated_at: now },
    ], {});

    // ===== ASISTENCIA
    await queryInterface.bulkInsert('AsistenciaOrigenTipo', [
      { codigo: 'manual', nombre: 'Manual', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'web',    nombre: 'Web',    descripcion: null, created_at: now, updated_at: now },
      { codigo: 'app',    nombre: 'App',    descripcion: null, created_at: now, updated_at: now },
      { codigo: 'auto',   nombre: 'Automático', descripcion: null, created_at: now, updated_at: now },
    ], {});

    await queryInterface.bulkInsert('AsistenciaCierreMotivoTipo', [
      { codigo: 'olvido_checkout', nombre: 'Olvido de Check-out', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'cierre_admin',    nombre: 'Cierre por Admin',    descripcion: null, created_at: now, updated_at: now },
      { codigo: 'fin_jornada',     nombre: 'Fin de Jornada',      descripcion: null, created_at: now, updated_at: now },
    ], {});

    // ===== CALENDARIO
    await queryInterface.bulkInsert('CalendarioTipo', [
      { codigo: 'personal', nombre: 'Personal', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'celula',   nombre: 'Célula',   descripcion: null, created_at: now, updated_at: now },
      { codigo: 'cliente',  nombre: 'Cliente',  descripcion: null, created_at: now, updated_at: now },
    ], {});

    await queryInterface.bulkInsert('VisibilidadTipo', [
      { codigo: 'privado',      nombre: 'Privado',      descripcion: null, created_at: now, updated_at: now },
      { codigo: 'equipo',       nombre: 'Equipo',       descripcion: null, created_at: now, updated_at: now },
      { codigo: 'organizacion', nombre: 'Organización', descripcion: null, created_at: now, updated_at: now },
    ], {});

    await queryInterface.bulkInsert('EventoTipo', [
      { codigo: 'reunion', nombre: 'Reunión', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'bloqueo', nombre: 'Bloqueo', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'tarea',   nombre: 'Tarea',   descripcion: null, created_at: now, updated_at: now },
      { codigo: 'otro',    nombre: 'Otro',    descripcion: null, created_at: now, updated_at: now },
    ], {});

    await queryInterface.bulkInsert('SyncDireccionTipo', [
      { codigo: 'local_a_google', nombre: 'Sólo local → Google', descripcion: null },
      { codigo: 'google_a_local', nombre: 'Sólo Google → local', descripcion: null },
      { codigo: 'bidireccional',  nombre: 'Bidireccional',       descripcion: null },
    ], {});

    await queryInterface.bulkInsert('AsistenteTipo', [
      { codigo: 'obligatorio', nombre: 'Obligatorio', descripcion: null },
      { codigo: 'opcional',    nombre: 'Opcional',    descripcion: null },
      { codigo: 'informativo', nombre: 'Informativo', descripcion: null },
    ], {});

    // ===== NOTIFICACIONES (SOLO catálogos que NO dependen de buzon_id)
    await queryInterface.bulkInsert('CanalTipo', [
      { codigo: 'in_app', nombre: 'In-App', descripcion: null },
      { codigo: 'email',  nombre: 'Email',  descripcion: null },
    ], {});

    await queryInterface.bulkInsert('ImportanciaTipo', [
      { codigo: 'alta',  nombre: 'Alta',  orden: 1 },
      { codigo: 'media', nombre: 'Media', orden: 2 },
      { codigo: 'baja',  nombre: 'Baja',  orden: 3 },
    ], {});

    await queryInterface.bulkInsert('EstadoEnvio', [
      { codigo: 'queued',    nombre: 'En cola',   descripcion: null },
      { codigo: 'sent',      nombre: 'Enviado',   descripcion: null },
      { codigo: 'delivered', nombre: 'Entregado', descripcion: null },
      { codigo: 'opened',    nombre: 'Abierto',   descripcion: null },
      { codigo: 'read',      nombre: 'Leído',     descripcion: null },
      { codigo: 'failed',    nombre: 'Fallido',   descripcion: null },
    ], {});

    await queryInterface.bulkInsert('ProveedorTipo', [
      { codigo: 'smtp',     nombre: 'SMTP',     descripcion: null },
      { codigo: 'firebase', nombre: 'Firebase', descripcion: null },
      { codigo: 'sendgrid', nombre: 'SendGrid', descripcion: null },
    ], {});
  },

  async down (queryInterface) {
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
