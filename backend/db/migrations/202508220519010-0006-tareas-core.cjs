// /backend/db/migrations/202508220900-0800-tareas-core.js
 
'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, BOOLEAN, DATE, BIGINT } = Sequelize;

    // ===== Catálogos =====
    await queryInterface.createTable('TareaEstado', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      codigo: { type: STRING(50), allowNull: false, unique: true },
      nombre: { type: STRING(100), allowNull: false },
      descripcion: { type: TEXT },
      created_at: { type: DATE, defaultValue: Sequelize.fn('now') },
      updated_at: { type: DATE, defaultValue: Sequelize.fn('now') }
    });

    await queryInterface.createTable('ImpactoTipo', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      codigo: { type: STRING(50), allowNull: false, unique: true },
      nombre: { type: STRING(100), allowNull: false },
      puntos: { type: INTEGER, allowNull: false, defaultValue: 2 },
      descripcion: { type: TEXT },
      created_at: { type: DATE, defaultValue: Sequelize.fn('now') },
      updated_at: { type: DATE, defaultValue: Sequelize.fn('now') }
    });

    await queryInterface.createTable('UrgenciaTipo', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      codigo: { type: STRING(50), allowNull: false, unique: true },
      nombre: { type: STRING(100), allowNull: false },
      puntos: { type: INTEGER, allowNull: false, defaultValue: 4 },
      descripcion: { type: TEXT },
      created_at: { type: DATE, defaultValue: Sequelize.fn('now') },
      updated_at: { type: DATE, defaultValue: Sequelize.fn('now') }
    });
    await queryInterface.sequelize.query(`COMMENT ON TABLE "UrgenciaTipo" IS 'Derivado del vencimiento; recalculable por servicio/job.'`);

    await queryInterface.createTable('ComentarioTipo', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      codigo: { type: STRING(50), allowNull: false, unique: true },
      nombre: { type: STRING(100), allowNull: false },
      descripcion: { type: TEXT },
      created_at: { type: DATE, defaultValue: Sequelize.fn('now') },
      updated_at: { type: DATE, defaultValue: Sequelize.fn('now') }
    });

    await queryInterface.createTable('TareaAprobacionEstado', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      codigo: { type: STRING(50), allowNull: false, unique: true },
      nombre: { type: STRING(100), allowNull: false },
      descripcion: { type: TEXT },
      created_at: { type: DATE, defaultValue: Sequelize.fn('now') },
      updated_at: { type: DATE, defaultValue: Sequelize.fn('now') }
    });

    // ===== Núcleo =====
    await queryInterface.createTable('Tarea', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      cliente_id: { type: INTEGER, allowNull: false,
        references: { model: 'Cliente', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      tarea_padre_id: { type: INTEGER,
        references: { model: 'Tarea', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      titulo: { type: STRING(200), allowNull: false },
      descripcion: { type: TEXT },
      estado_id: { type: INTEGER, allowNull: false,
        references: { model: 'TareaEstado', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      creado_por_feder_id: { type: INTEGER, allowNull: false,
        references: { model: 'Feder', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },

      requiere_aprobacion: { type: BOOLEAN, allowNull: false, defaultValue: false },
      aprobacion_estado_id: { type: INTEGER, allowNull: false, defaultValue: 1,
        references: { model: 'TareaAprobacionEstado', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      aprobado_por_user_id: { type: INTEGER,
        references: { model: 'User', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      aprobado_at: { type: DATE },
      rechazado_por_user_id: { type: INTEGER,
        references: { model: 'User', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      rechazado_at: { type: DATE },
      rechazo_motivo: { type: TEXT },

      vencimiento: { type: DATE },
      impacto_id: { type: INTEGER, allowNull: false, defaultValue: 2,
        references: { model: 'ImpactoTipo', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      urgencia_id: { type: INTEGER, allowNull: false, defaultValue: 4,
        references: { model: 'UrgenciaTipo', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      prioridad_num: { type: INTEGER, allowNull: false, defaultValue: 0 },
      cliente_ponderacion: { type: INTEGER, allowNull: false, defaultValue: 3 },

      is_archivada: { type: BOOLEAN, allowNull: false, defaultValue: false },
      finalizada_at: { type: DATE },

      created_at: { type: DATE, defaultValue: Sequelize.fn('now') },
      updated_at: { type: DATE, defaultValue: Sequelize.fn('now') }
    });

    // Índices Tarea
    await queryInterface.addIndex('Tarea', ['cliente_id']);
    await queryInterface.addIndex('Tarea', ['estado_id']);
    await queryInterface.addIndex('Tarea', ['vencimiento']);
    await queryInterface.addIndex('Tarea', ['prioridad_num']);
    await queryInterface.addIndex('Tarea', ['tarea_padre_id']);

    // Responsables
    await queryInterface.createTable('TareaResponsable', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      tarea_id: { type: INTEGER, allowNull: false,
        references: { model: 'Tarea', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      feder_id: { type: INTEGER, allowNull: false,
        references: { model: 'Feder', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      es_lider: { type: BOOLEAN, allowNull: false, defaultValue: false },
      asignado_at: { type: DATE, defaultValue: Sequelize.fn('now') }
    });
    await queryInterface.addIndex('TareaResponsable', ['tarea_id', 'feder_id'], { unique: true });

    // Colaboradores
    await queryInterface.createTable('TareaColaborador', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      tarea_id: { type: INTEGER, allowNull: false,
        references: { model: 'Tarea', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      feder_id: { type: INTEGER, allowNull: false,
        references: { model: 'Feder', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      rol: { type: STRING(100) },
      created_at: { type: DATE, defaultValue: Sequelize.fn('now') }
    });
    await queryInterface.addIndex('TareaColaborador', ['tarea_id', 'feder_id'], { unique: true });

    // Comentarios
    await queryInterface.createTable('TareaComentario', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      tarea_id: { type: INTEGER, allowNull: false,
        references: { model: 'Tarea', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      feder_id: { type: INTEGER, allowNull: false,
        references: { model: 'Feder', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      tipo_id: { type: INTEGER, allowNull: false,
        references: { model: 'ComentarioTipo', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      contenido: { type: TEXT, allowNull: false },
      created_at: { type: DATE, defaultValue: Sequelize.fn('now') },
      updated_at: { type: DATE, defaultValue: Sequelize.fn('now') }
    });
    await queryInterface.addIndex('TareaComentario', ['tarea_id', 'created_at']);

    // Adjuntos
    await queryInterface.createTable('TareaAdjunto', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      tarea_id: { type: INTEGER, allowNull: false,
        references: { model: 'Tarea', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      nombre: { type: STRING(255) },
      mime: { type: STRING(120) },
      tamano_bytes: { type: BIGINT },
      drive_file_id: { type: STRING(255) },
      drive_url: { type: STRING(512) },
      subido_por_feder_id: { type: INTEGER,
        references: { model: 'Feder', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: DATE, defaultValue: Sequelize.fn('now') }
    });
    await queryInterface.addIndex('TareaAdjunto', ['tarea_id']);
  },

  async down (queryInterface) {
    // bajar en orden inverso para no romper FKs
    await queryInterface.dropTable('TareaAdjunto');
    await queryInterface.dropTable('TareaComentario');
    await queryInterface.dropTable('TareaColaborador');
    await queryInterface.dropTable('TareaResponsable');
    await queryInterface.dropTable('Tarea');
    await queryInterface.dropTable('TareaAprobacionEstado');
    await queryInterface.dropTable('ComentarioTipo');
    await queryInterface.dropTable('UrgenciaTipo');
    await queryInterface.dropTable('ImpactoTipo');
    await queryInterface.dropTable('TareaEstado');
  }
};
