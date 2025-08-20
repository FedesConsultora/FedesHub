'use strict';

/**
 * backend/db/migrations/XXXXXXXXXXXXXX-0002-ausencias-cuotas-y-asignaciones.js
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1) Catálogo de unidades (dias/horas)
    await queryInterface.createTable('AusenciaUnidadTipo', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      codigo: { type: Sequelize.STRING(10), allowNull: false, unique: true }, // 'dias','horas'
      nombre: { type: Sequelize.STRING(30), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    // 2) Nuevas columnas en AusenciaTipo
    await queryInterface.addColumn('AusenciaTipo', 'unidad_id', {
      type: Sequelize.INTEGER,
      allowNull: true // lo hacemos nullable primero para poder poblarlo
    });
    await queryInterface.addColumn('AusenciaTipo', 'requiere_asignacion', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
    await queryInterface.addColumn('AusenciaTipo', 'permite_medio_dia', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    // 2.a) FK unidad_id
    await queryInterface.addConstraint('AusenciaTipo', {
      fields: ['unidad_id'],
      type: 'foreign key',
      name: 'fk_AusenciaTipo_unidad',
      references: { table: 'AusenciaUnidadTipo', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });

    // 2.b) Semilla mínima de unidades + setear por defecto 'dias' a tipos existentes
    await queryInterface.sequelize.query(`
      INSERT INTO "AusenciaUnidadTipo"(codigo, nombre, created_at, updated_at)
      VALUES ('dias','Días', NOW(), NOW())
      ON CONFLICT (codigo) DO NOTHING;
    `);
    await queryInterface.sequelize.query(`
      INSERT INTO "AusenciaUnidadTipo"(codigo, nombre, created_at, updated_at)
      VALUES ('horas','Horas', NOW(), NOW())
      ON CONFLICT (codigo) DO NOTHING;
    `);
    await queryInterface.sequelize.query(`
      UPDATE "AusenciaTipo" SET unidad_id = (
        SELECT id FROM "AusenciaUnidadTipo" WHERE codigo = 'dias'
      )
      WHERE unidad_id IS NULL;
    `);
    // 2.c) Volver NOT NULL
    await queryInterface.changeColumn('AusenciaTipo', 'unidad_id', {
      type: Sequelize.INTEGER,
      allowNull: false
    });

    // 3) Nueva columna en Ausencia (para tipos por horas)
    await queryInterface.addColumn('Ausencia', 'duracion_horas', {
      type: Sequelize.DECIMAL(10,2), // ej. 1.00, 4.00, 8.00
      allowNull: true
    });

    // 3.a) Check: si es_medio_dia entonces fecha_desde = fecha_hasta
    await queryInterface.sequelize.query(`
      ALTER TABLE "Ausencia"
      ADD CONSTRAINT "ck_Ausencia_medio_dia_fechas"
      CHECK (es_medio_dia = false OR fecha_desde = fecha_hasta)
    `);

    // 4) Cuotas/asignaciones
    await queryInterface.createTable('AusenciaCuota', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      feder_id: { type: Sequelize.INTEGER, allowNull: false },
      tipo_id: { type: Sequelize.INTEGER, allowNull: false },
      unidad_id: { type: Sequelize.INTEGER, allowNull: false },
      cantidad_total: { type: Sequelize.DECIMAL(10,2), allowNull: false },
      vigencia_desde: { type: Sequelize.DATEONLY, allowNull: false },
      vigencia_hasta: { type: Sequelize.DATEONLY, allowNull: false },
      asignado_por_user_id: { type: Sequelize.INTEGER, allowNull: true },
      comentario: { type: Sequelize.TEXT },
      is_activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    // 4.a) FKs e índices de cuotas
    await queryInterface.addConstraint('AusenciaCuota', {
      fields: ['feder_id'],
      type: 'foreign key',
      name: 'fk_AusenciaCuota_feder',
      references: { table: 'Feder', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
    await queryInterface.addConstraint('AusenciaCuota', {
      fields: ['tipo_id'],
      type: 'foreign key',
      name: 'fk_AusenciaCuota_tipo',
      references: { table: 'AusenciaTipo', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });
    await queryInterface.addConstraint('AusenciaCuota', {
      fields: ['unidad_id'],
      type: 'foreign key',
      name: 'fk_AusenciaCuota_unidad',
      references: { table: 'AusenciaUnidadTipo', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });
    await queryInterface.addConstraint('AusenciaCuota', {
      fields: ['asignado_por_user_id'],
      type: 'foreign key',
      name: 'fk_AusenciaCuota_asignado_por',
      references: { table: 'User', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    await queryInterface.addIndex('AusenciaCuota', ['feder_id', 'tipo_id', 'vigencia_desde'], {
      name: 'ix_AusenciaCuota_feder_tipo_vigencia'
    });

    // 5) Consumos de cuotas (al aprobar)
    await queryInterface.createTable('AusenciaCuotaConsumo', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      cuota_id: { type: Sequelize.INTEGER, allowNull: false },
      ausencia_id: { type: Sequelize.INTEGER, allowNull: false },
      cantidad_consumida: { type: Sequelize.DECIMAL(10,2), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addConstraint('AusenciaCuotaConsumo', {
      fields: ['cuota_id'],
      type: 'foreign key',
      name: 'fk_AusenciaCuotaConsumo_cuota',
      references: { table: 'AusenciaCuota', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
    await queryInterface.addConstraint('AusenciaCuotaConsumo', {
      fields: ['ausencia_id'],
      type: 'foreign key',
      name: 'fk_AusenciaCuotaConsumo_ausencia',
      references: { table: 'Ausencia', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
    await queryInterface.addIndex('AusenciaCuotaConsumo', ['cuota_id'], { name: 'ix_AusenciaCuotaConsumo_cuota' });
    await queryInterface.addIndex('AusenciaCuotaConsumo', ['ausencia_id'], { name: 'ix_AusenciaCuotaConsumo_ausencia' });

    // 6) Estados de solicitud de asignación
    await queryInterface.createTable('AsignacionSolicitudEstado', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      codigo: { type: Sequelize.STRING(30), allowNull: false, unique: true }, // 'pendiente','aprobada','rechazada'
      nombre: { type: Sequelize.STRING(80), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    // 7) Solicitudes de asignación
    await queryInterface.createTable('AusenciaAsignacionSolicitud', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      feder_id: { type: Sequelize.INTEGER, allowNull: false },                // quién pide
      tipo_id: { type: Sequelize.INTEGER, allowNull: false },
      unidad_id: { type: Sequelize.INTEGER, allowNull: false },
      cantidad_solicitada: { type: Sequelize.DECIMAL(10,2), allowNull: false },
      vigencia_desde: { type: Sequelize.DATEONLY, allowNull: false },
      vigencia_hasta: { type: Sequelize.DATEONLY, allowNull: false },
      motivo: { type: Sequelize.TEXT },
      estado_id: { type: Sequelize.INTEGER, allowNull: false },               // FK a AsignacionSolicitudEstado
      aprobado_por_user_id: { type: Sequelize.INTEGER, allowNull: true },
      aprobado_at: { type: Sequelize.DATE, allowNull: true },
      comentario_admin: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.addConstraint('AusenciaAsignacionSolicitud', {
      fields: ['feder_id'],
      type: 'foreign key',
      name: 'fk_AusenciaAsignacionSolicitud_feder',
      references: { table: 'Feder', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
    await queryInterface.addConstraint('AusenciaAsignacionSolicitud', {
      fields: ['tipo_id'],
      type: 'foreign key',
      name: 'fk_AusenciaAsignacionSolicitud_tipo',
      references: { table: 'AusenciaTipo', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });
    await queryInterface.addConstraint('AusenciaAsignacionSolicitud', {
      fields: ['unidad_id'],
      type: 'foreign key',
      name: 'fk_AusenciaAsignacionSolicitud_unidad',
      references: { table: 'AusenciaUnidadTipo', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });
    await queryInterface.addConstraint('AusenciaAsignacionSolicitud', {
      fields: ['estado_id'],
      type: 'foreign key',
      name: 'fk_AusenciaAsignacionSolicitud_estado',
      references: { table: 'AsignacionSolicitudEstado', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });
    await queryInterface.addConstraint('AusenciaAsignacionSolicitud', {
      fields: ['aprobado_por_user_id'],
      type: 'foreign key',
      name: 'fk_AusenciaAsignacionSolicitud_aprobado_por',
      references: { table: 'User', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    await queryInterface.addIndex('AusenciaAsignacionSolicitud', ['feder_id', 'tipo_id', 'created_at'], {
      name: 'ix_AusenciaAsignacionSolicitud_feder_tipo_created'
    });
  },

  async down(queryInterface, Sequelize) {
    // Revertir en orden inverso
    await queryInterface.removeIndex('AusenciaAsignacionSolicitud', 'ix_AusenciaAsignacionSolicitud_feder_tipo_created')
      .catch(() => {});
    await queryInterface.removeConstraint('AusenciaAsignacionSolicitud', 'fk_AusenciaAsignacionSolicitud_aprobado_por').catch(() => {});
    await queryInterface.removeConstraint('AusenciaAsignacionSolicitud', 'fk_AusenciaAsignacionSolicitud_estado').catch(() => {});
    await queryInterface.removeConstraint('AusenciaAsignacionSolicitud', 'fk_AusenciaAsignacionSolicitud_unidad').catch(() => {});
    await queryInterface.removeConstraint('AusenciaAsignacionSolicitud', 'fk_AusenciaAsignacionSolicitud_tipo').catch(() => {});
    await queryInterface.removeConstraint('AusenciaAsignacionSolicitud', 'fk_AusenciaAsignacionSolicitud_feder').catch(() => {});
    await queryInterface.dropTable('AusenciaAsignacionSolicitud');

    await queryInterface.dropTable('AsignacionSolicitudEstado');

    await queryInterface.removeIndex('AusenciaCuotaConsumo', 'ix_AusenciaCuotaConsumo_ausencia').catch(() => {});
    await queryInterface.removeIndex('AusenciaCuotaConsumo', 'ix_AusenciaCuotaConsumo_cuota').catch(() => {});
    await queryInterface.removeConstraint('AusenciaCuotaConsumo', 'fk_AusenciaCuotaConsumo_ausencia').catch(() => {});
    await queryInterface.removeConstraint('AusenciaCuotaConsumo', 'fk_AusenciaCuotaConsumo_cuota').catch(() => {});
    await queryInterface.dropTable('AusenciaCuotaConsumo');

    await queryInterface.removeIndex('AusenciaCuota', 'ix_AusenciaCuota_feder_tipo_vigencia').catch(() => {});
    await queryInterface.removeConstraint('AusenciaCuota', 'fk_AusenciaCuota_asignado_por').catch(() => {});
    await queryInterface.removeConstraint('AusenciaCuota', 'fk_AusenciaCuota_unidad').catch(() => {});
    await queryInterface.removeConstraint('AusenciaCuota', 'fk_AusenciaCuota_tipo').catch(() => {});
    await queryInterface.removeConstraint('AusenciaCuota', 'fk_AusenciaCuota_feder').catch(() => {});
    await queryInterface.dropTable('AusenciaCuota');

    await queryInterface.sequelize.query(`
      ALTER TABLE "Ausencia" DROP CONSTRAINT IF EXISTS "ck_Ausencia_medio_dia_fechas"
    `);
    await queryInterface.removeColumn('Ausencia', 'duracion_horas');

    await queryInterface.removeConstraint('AusenciaTipo', 'fk_AusenciaTipo_unidad').catch(() => {});
    await queryInterface.removeColumn('AusenciaTipo', 'permite_medio_dia').catch(() => {});
    await queryInterface.removeColumn('AusenciaTipo', 'requiere_asignacion').catch(() => {});
    await queryInterface.removeColumn('AusenciaTipo', 'unidad_id').catch(() => {});

    await queryInterface.dropTable('AusenciaUnidadTipo');
  }
};