// backend/db/migrations/0001-initial-schema.cjs
/** Migración inicial de TODO el esquema FedesHub (10 módulos) */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = Sequelize.fn('now');

    // ========== Helpers ==========
    const idPK = { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true };
    const tsCols = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now }
    };

    // =========================================================
    // ================ MÓDULO 1: AUTH =========================
    // =========================================================
    await queryInterface.createTable('RolTipo', {
      id: idPK,
      codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      descripcion: Sequelize.TEXT,
      ...tsCols
    });

    await queryInterface.createTable('Modulo', {
      id: idPK,
      codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      descripcion: Sequelize.TEXT,
      ...tsCols
    });

    await queryInterface.createTable('Accion', {
      id: idPK,
      codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      descripcion: Sequelize.TEXT,
      ...tsCols
    });

    await queryInterface.createTable('AuthEmailDominio', {
      id: idPK,
      dominio: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      is_activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...tsCols
    });

    await queryInterface.createTable('User', {
      id: idPK,
      email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      is_activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      email_dominio_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'AuthEmailDominio', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      ...tsCols
    });

    await queryInterface.createTable('Rol', {
      id: idPK,
      nombre: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      descripcion: Sequelize.TEXT,
      rol_tipo_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'RolTipo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      ...tsCols
    });

    await queryInterface.createTable('Permiso', {
      id: idPK,
      modulo_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Modulo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      accion_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Accion', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      nombre: { type: Sequelize.STRING(150), allowNull: false },
      descripcion: Sequelize.TEXT,
      ...tsCols
    });
    await queryInterface.addConstraint('Permiso', {
      fields: ['modulo_id', 'accion_id'],
      type: 'unique',
      name: 'UQ_Permiso_modulo_accion'
    });

    await queryInterface.createTable('UserRol', {
      id: idPK,
      user_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'User', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      rol_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Rol', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now }
    });
    await queryInterface.addConstraint('UserRol', {
      fields: ['user_id', 'rol_id'],
      type: 'unique',
      name: 'UQ_UserRol_user_rol'
    });

    await queryInterface.createTable('RolPermiso', {
      id: idPK,
      rol_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Rol', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      permiso_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Permiso', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now }
    });
    await queryInterface.addConstraint('RolPermiso', {
      fields: ['rol_id', 'permiso_id'],
      type: 'unique',
      name: 'UQ_RolPermiso_rol_permiso'
    });

    await queryInterface.createTable('JwtRevocacion', {
      id: idPK,
      jti: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      user_id: {
        type: Sequelize.INTEGER,
        references: { model: 'User', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      revoked_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      motivo: Sequelize.TEXT
    });

    // =========================================================
    // ================ MÓDULO 6: CÉLULAS ======================
    // (antes que Feders, para resolver FK de Feder.celula_id)
    // =========================================================
    await queryInterface.createTable('CelulaEstado', {
      id: idPK,
      codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      descripcion: Sequelize.TEXT,
      ...tsCols
    });

    await queryInterface.createTable('CelulaRolTipo', {
      id: idPK,
      codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(120), allowNull: false },
      descripcion: Sequelize.TEXT,
      ...tsCols
    });

    await queryInterface.createTable('Celula', {
      id: idPK,
      nombre: { type: Sequelize.STRING(120), allowNull: false, unique: true },
      descripcion: Sequelize.TEXT,
      estado_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'CelulaEstado', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      ...tsCols
    });

    await queryInterface.createTable('CelulaRolAsignacion', {
      id: idPK,
      celula_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Celula', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      feder_id: { type: Sequelize.INTEGER, allowNull: false }, // FK a Feder (se agrega luego)
      rol_tipo_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'CelulaRolTipo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      desde: { type: Sequelize.DATEONLY, allowNull: false },
      hasta: Sequelize.DATEONLY,
      es_principal: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      observacion: Sequelize.TEXT,
      ...tsCols
    });

    // =========================================================
    // ================ MÓDULO 2: CARGOS =======================
    // =========================================================
    await queryInterface.createTable('CargoAmbito', {
      id: idPK,
      codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      descripcion: Sequelize.TEXT,
      ...tsCols
    });

    await queryInterface.createTable('Cargo', {
      id: idPK,
      nombre: { type: Sequelize.STRING(120), allowNull: false, unique: true },
      descripcion: Sequelize.TEXT,
      ambito_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'CargoAmbito', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      is_activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...tsCols
    });

    // =========================================================
    // ================ MÓDULO 3: FEDERS =======================
    // =========================================================
    await queryInterface.createTable('FederEstadoTipo', {
      id: idPK,
      codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      descripcion: Sequelize.TEXT,
      ...tsCols
    });

    await queryInterface.createTable('ModalidadTrabajoTipo', {
      id: idPK,
      codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      descripcion: Sequelize.TEXT,
      ...tsCols
    });

    await queryInterface.createTable('DiaSemana', {
      id: { type: Sequelize.SMALLINT, primaryKey: true },
      codigo: { type: Sequelize.STRING(10), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(20), allowNull: false }
    });

    await queryInterface.createTable('Feder', {
      id: idPK,
      user_id: {
        type: Sequelize.INTEGER,
        references: { model: 'User', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      celula_id: {
        type: Sequelize.INTEGER,
        references: { model: 'Celula', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      estado_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'FederEstadoTipo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      nombre: { type: Sequelize.STRING(120), allowNull: false },
      apellido: { type: Sequelize.STRING(120), allowNull: false },
      telefono: Sequelize.STRING(30),
      avatar_url: Sequelize.STRING(512),
      fecha_ingreso: Sequelize.DATEONLY,
      fecha_egreso: Sequelize.DATEONLY,
      is_activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...tsCols
    });

    await queryInterface.createTable('FederModalidadDia', {
      id: idPK,
      feder_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Feder', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      dia_semana_id: {
        type: Sequelize.SMALLINT, allowNull: false,
        references: { model: 'DiaSemana', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      modalidad_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'ModalidadTrabajoTipo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      comentario: Sequelize.TEXT,
      is_activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...tsCols
    });
    await queryInterface.addConstraint('FederModalidadDia', {
      fields: ['feder_id', 'dia_semana_id'],
      type: 'unique',
      name: 'UQ_FederModalidadDia_feder_dia'
    });

    await queryInterface.createTable('FederCargo', {
      id: idPK,
      feder_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Feder', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      cargo_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Cargo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      es_principal: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      desde: { type: Sequelize.DATEONLY, allowNull: false },
      hasta: Sequelize.DATEONLY,
      observacion: Sequelize.TEXT,
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now }
    });

    // =========================================================
    // ================ MÓDULO 4: ASISTENCIA ===================
    // =========================================================
    await queryInterface.createTable('AsistenciaOrigenTipo', {
      id: idPK,
      codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      descripcion: Sequelize.TEXT,
      ...tsCols
    });

    await queryInterface.createTable('AsistenciaCierreMotivoTipo', {
      id: idPK,
      codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      descripcion: Sequelize.TEXT,
      ...tsCols
    });

    await queryInterface.createTable('AsistenciaRegistro', {
      id: idPK,
      feder_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Feder', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      check_in_at: { type: Sequelize.DATE, allowNull: false },
      check_in_origen_id: {
        type: Sequelize.INTEGER,
        references: { model: 'AsistenciaOrigenTipo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      check_out_at: Sequelize.DATE,
      check_out_origen_id: {
        type: Sequelize.INTEGER,
        references: { model: 'AsistenciaOrigenTipo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      cierre_motivo_id: {
        type: Sequelize.INTEGER,
        references: { model: 'AsistenciaCierreMotivoTipo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      comentario: Sequelize.TEXT,
      ...tsCols
    });

    // =========================================================
    // ================ MÓDULO 5: AUSENCIAS ====================
    // =========================================================
    await queryInterface.createTable('AusenciaTipo', {
      id: idPK,
      codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      descripcion: Sequelize.TEXT,
      ...tsCols
    });

    await queryInterface.createTable('AusenciaEstado', {
      id: idPK,
      codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      descripcion: Sequelize.TEXT,
      ...tsCols
    });

    await queryInterface.createTable('MitadDiaTipo', {
      id: { type: Sequelize.SMALLINT, primaryKey: true },
      codigo: { type: Sequelize.STRING(10), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(20), allowNull: false }
    });

    await queryInterface.createTable('Ausencia', {
      id: idPK,
      feder_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Feder', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      tipo_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'AusenciaTipo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      estado_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'AusenciaEstado', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      fecha_desde: { type: Sequelize.DATEONLY, allowNull: false },
      fecha_hasta: { type: Sequelize.DATEONLY, allowNull: false },
      es_medio_dia: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      mitad_dia_id: {
        type: Sequelize.SMALLINT,
        references: { model: 'MitadDiaTipo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      motivo: Sequelize.TEXT,
      comentario_admin: Sequelize.TEXT,
      aprobado_por_user_id: {
        type: Sequelize.INTEGER,
        references: { model: 'User', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      aprobado_at: Sequelize.DATE,
      denegado_motivo: Sequelize.TEXT,
      creado_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      actualizado_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now }
    });

    // =========================================================
    // ================ MÓDULO 7: CLIENTES =====================
    // =========================================================
    await queryInterface.createTable('ClienteTipo', {
      id: idPK,
      codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      ponderacion: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 3 },
      descripcion: Sequelize.TEXT,
      ...tsCols
    });

    await queryInterface.createTable('ClienteEstado', {
      id: idPK,
      codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      descripcion: Sequelize.TEXT,
      ...tsCols
    });

    await queryInterface.createTable('Cliente', {
      id: idPK,
      celula_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Celula', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      tipo_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'ClienteTipo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      estado_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'ClienteEstado', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      nombre: { type: Sequelize.STRING(160), allowNull: false, unique: true },
      alias: Sequelize.STRING(120),
      email: Sequelize.STRING(255),
      telefono: Sequelize.STRING(40),
      sitio_web: Sequelize.STRING(255),
      descripcion: Sequelize.TEXT,
      ponderacion: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 3 },
      ...tsCols
    });

    await queryInterface.createTable('ClienteContacto', {
      id: idPK,
      cliente_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Cliente', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      nombre: { type: Sequelize.STRING(160), allowNull: false },
      cargo: Sequelize.STRING(120),
      email: Sequelize.STRING(255),
      telefono: Sequelize.STRING(40),
      es_principal: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      ...tsCols
    });

    // =========================================================
    // ================ MÓDULO 8: TAREAS =======================
    // =========================================================
    await queryInterface.createTable('TareaEstado', {
      id: idPK,
      codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      descripcion: Sequelize.TEXT,
      ...tsCols
    });

    await queryInterface.createTable('ImpactoTipo', {
      id: idPK,
      codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      puntos: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 2 },
      descripcion: Sequelize.TEXT,
      ...tsCols
    });

    await queryInterface.createTable('UrgenciaTipo', {
      id: idPK,
      codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      puntos: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 4 },
      descripcion: Sequelize.TEXT,
      ...tsCols
    });

    await queryInterface.createTable('ComentarioTipo', {
      id: idPK,
      codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      descripcion: Sequelize.TEXT,
      ...tsCols
    });

    await queryInterface.createTable('TareaAprobacionEstado', {
      id: idPK,
      codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      descripcion: Sequelize.TEXT,
      ...tsCols
    });

    await queryInterface.createTable('Tarea', {
      id: idPK,
      cliente_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Cliente', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      tarea_padre_id: {
        type: Sequelize.INTEGER,
        references: { model: 'Tarea', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      titulo: { type: Sequelize.STRING(200), allowNull: false },
      descripcion: Sequelize.TEXT,
      estado_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'TareaEstado', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      creado_por_feder_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Feder', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      requiere_aprobacion: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      aprobacion_estado_id: {
        type: Sequelize.INTEGER, allowNull: false, defaultValue: 1,
        references: { model: 'TareaAprobacionEstado', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      aprobado_por_user_id: {
        type: Sequelize.INTEGER,
        references: { model: 'User', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      aprobado_at: Sequelize.DATE,
      rechazado_por_user_id: {
        type: Sequelize.INTEGER,
        references: { model: 'User', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      rechazado_at: Sequelize.DATE,
      rechazo_motivo: Sequelize.TEXT,
      vencimiento: Sequelize.DATE,
      impacto_id: {
        type: Sequelize.INTEGER, allowNull: false, defaultValue: 2,
        references: { model: 'ImpactoTipo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      urgencia_id: {
        type: Sequelize.INTEGER, allowNull: false, defaultValue: 4,
        references: { model: 'UrgenciaTipo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      prioridad_num: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      cliente_ponderacion: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 3 },
      is_archivada: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      finalizada_at: Sequelize.DATE,
      ...tsCols
    });

    await queryInterface.createTable('TareaResponsable', {
      id: idPK,
      tarea_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Tarea', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      feder_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Feder', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      es_lider: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      asignado_at: { type: Sequelize.DATE, defaultValue: now }
    });
    await queryInterface.addConstraint('TareaResponsable', {
      fields: ['tarea_id', 'feder_id'],
      type: 'unique',
      name: 'UQ_TareaResponsable_tarea_feder'
    });

    await queryInterface.createTable('TareaColaborador', {
      id: idPK,
      tarea_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Tarea', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      feder_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Feder', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      rol: Sequelize.STRING(100),
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now }
    });
    await queryInterface.addConstraint('TareaColaborador', {
      fields: ['tarea_id', 'feder_id'],
      type: 'unique',
      name: 'UQ_TareaColaborador_tarea_feder'
    });

    await queryInterface.createTable('TareaComentario', {
      id: idPK,
      tarea_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Tarea', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      feder_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Feder', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      tipo_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'ComentarioTipo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      contenido: { type: Sequelize.TEXT, allowNull: false },
      ...tsCols
    });

    await queryInterface.createTable('TareaAdjunto', {
      id: idPK,
      tarea_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Tarea', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      nombre: Sequelize.STRING(255),
      mime: Sequelize.STRING(120),
      tamano_bytes: Sequelize.BIGINT,
      drive_file_id: Sequelize.STRING(255),
      drive_url: Sequelize.STRING(512),
      subido_por_feder_id: {
        type: Sequelize.INTEGER,
        references: { model: 'Feder', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now }
    });

    // =========================================================
    // ================ MÓDULO 9: CALENDARIO ===================
    // =========================================================
    await queryInterface.createTable('CalendarioTipo', {
      id: idPK,
      codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      descripcion: Sequelize.TEXT,
      ...tsCols
    });

    await queryInterface.createTable('VisibilidadTipo', {
      id: idPK,
      codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      descripcion: Sequelize.TEXT,
      ...tsCols
    });

    await queryInterface.createTable('EventoTipo', {
      id: idPK,
      codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(120), allowNull: false },
      descripcion: Sequelize.TEXT,
      ...tsCols
    });

    await queryInterface.createTable('SyncDireccionTipo', {
      id: idPK,
      codigo: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(60), allowNull: false },
      descripcion: Sequelize.TEXT
    });

    await queryInterface.createTable('AsistenteTipo', {
      id: idPK,
      codigo: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(60), allowNull: false },
      descripcion: Sequelize.TEXT
    });

    await queryInterface.createTable('CalendarioLocal', {
      id: idPK,
      tipo_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'CalendarioTipo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      nombre: { type: Sequelize.STRING(160), allowNull: false },
      visibilidad_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'VisibilidadTipo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      feder_id: {
        type: Sequelize.INTEGER,
        references: { model: 'Feder', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      celula_id: {
        type: Sequelize.INTEGER,
        references: { model: 'Celula', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      cliente_id: {
        type: Sequelize.INTEGER,
        references: { model: 'Cliente', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      time_zone: Sequelize.STRING(60),
      color: Sequelize.STRING(30),
      is_activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...tsCols
    });

    await queryInterface.createTable('Evento', {
      id: idPK,
      calendario_local_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'CalendarioLocal', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      tipo_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'EventoTipo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      titulo: { type: Sequelize.STRING(200), allowNull: false },
      descripcion: Sequelize.TEXT,
      lugar: Sequelize.STRING(255),
      all_day: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      starts_at: { type: Sequelize.DATE, allowNull: false },
      ends_at: { type: Sequelize.DATE, allowNull: false },
      rrule: Sequelize.STRING(255),
      visibilidad_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'VisibilidadTipo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      color: Sequelize.STRING(30),
      asistencia_registro_id: {
        type: Sequelize.INTEGER,
        references: { model: 'AsistenciaRegistro', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      ausencia_id: {
        type: Sequelize.INTEGER,
        references: { model: 'Ausencia', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      tarea_id: {
        type: Sequelize.INTEGER,
        references: { model: 'Tarea', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      created_by_user_id: {
        type: Sequelize.INTEGER,
        references: { model: 'User', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      updated_by_user_id: {
        type: Sequelize.INTEGER,
        references: { model: 'User', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      ...tsCols
    });

    await queryInterface.createTable('EventoAsistente', {
      id: idPK,
      evento_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Evento', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      tipo_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'AsistenteTipo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      feder_id: {
        type: Sequelize.INTEGER,
        references: { model: 'Feder', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      email_externo: Sequelize.STRING(255),
      nombre: Sequelize.STRING(160),
      respuesta: Sequelize.STRING(30),
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now }
    });

    await queryInterface.createTable('GoogleCuenta', {
      id: idPK,
      user_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'User', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      google_user_id: { type: Sequelize.STRING(128), allowNull: false, unique: true },
      email: { type: Sequelize.STRING(255), allowNull: false },
      refresh_token_enc: Sequelize.TEXT,
      token_scope: Sequelize.TEXT,
      connected_at: Sequelize.DATE,
      revoked_at: Sequelize.DATE,
      ...tsCols
    });

    await queryInterface.createTable('GoogleCalendario', {
      id: idPK,
      google_calendar_id: { type: Sequelize.STRING(256), allowNull: false },
      cuenta_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'GoogleCuenta', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      summary: Sequelize.STRING(200),
      time_zone: Sequelize.STRING(60),
      access_role: Sequelize.STRING(60),
      is_primary: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      color_id: Sequelize.STRING(20),
      ...tsCols
    });

    await queryInterface.createTable('CalendarioVinculo', {
      id: idPK,
      calendario_local_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'CalendarioLocal', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      google_cal_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'GoogleCalendario', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      direccion_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'SyncDireccionTipo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      sync_token: Sequelize.TEXT,
      last_synced_at: Sequelize.DATE,
      is_activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...tsCols
    });
    await queryInterface.addConstraint('CalendarioVinculo', {
      fields: ['calendario_local_id', 'google_cal_id'],
      type: 'unique',
      name: 'UQ_CalendarioVinculo_local_google'
    });

    await queryInterface.createTable('GoogleWebhookCanal', {
      id: idPK,
      cuenta_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'GoogleCuenta', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      channel_id: { type: Sequelize.STRING(200), allowNull: false, unique: true },
      resource_id: { type: Sequelize.STRING(200), allowNull: false },
      resource_uri: Sequelize.TEXT,
      expiration_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      is_activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true }
    });

    await queryInterface.createTable('EventoSync', {
      id: idPK,
      evento_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Evento', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      google_cal_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'GoogleCalendario', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      google_event_id: { type: Sequelize.STRING(256), allowNull: false },
      etag: Sequelize.STRING(128),
      last_synced_at: Sequelize.DATE,
      last_error: Sequelize.TEXT,
      is_deleted_remote: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      is_deleted_local: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }
    });
    await queryInterface.addConstraint('EventoSync', {
      fields: ['evento_id', 'google_cal_id'],
      type: 'unique',
      name: 'UQ_EventoSync_evento_google'
    });

    // =========================================================
    // ============ MÓDULO 10: NOTIFICACIONES ==================
    // =========================================================
    await queryInterface.createTable('NotificacionTipo', {
      id: idPK,
      codigo: { type: Sequelize.STRING(60), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(120), allowNull: false },
      descripcion: Sequelize.TEXT,
      ...tsCols
    });

    await queryInterface.createTable('CanalTipo', {
      id: idPK,
      codigo: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(60), allowNull: false },
      descripcion: Sequelize.TEXT
    });

    await queryInterface.createTable('ImportanciaTipo', {
      id: idPK,
      codigo: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(60), allowNull: false },
      orden: { type: Sequelize.SMALLINT, allowNull: false, defaultValue: 2 }
    });

    await queryInterface.createTable('EstadoEnvio', {
      id: idPK,
      codigo: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(60), allowNull: false },
      descripcion: Sequelize.TEXT
    });

    await queryInterface.createTable('ProveedorTipo', {
      id: idPK,
      codigo: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(60), allowNull: false },
      descripcion: Sequelize.TEXT
    });

    await queryInterface.createTable('NotificacionPreferencia', {
      id: idPK,
      user_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'User', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      tipo_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'NotificacionTipo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      canal_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'CanalTipo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      is_habilitado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...tsCols
    });
    await queryInterface.addConstraint('NotificacionPreferencia', {
      fields: ['user_id', 'tipo_id', 'canal_id'],
      type: 'unique',
      name: 'UQ_NotifPref_user_tipo_canal'
    });

    await queryInterface.createTable('NotificacionPlantilla', {
      id: idPK,
      tipo_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'NotificacionTipo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      canal_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'CanalTipo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      idioma: { type: Sequelize.STRING(10), allowNull: false },
      asunto_tpl: Sequelize.STRING(200),
      cuerpo_tpl: Sequelize.TEXT,
      data_schema_json: Sequelize.TEXT,
      is_activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...tsCols
    });
    await queryInterface.addConstraint('NotificacionPlantilla', {
      fields: ['tipo_id', 'canal_id', 'idioma'],
      type: 'unique',
      name: 'UQ_NotifPlantilla_tipo_canal_idioma'
    });

    await queryInterface.createTable('Notificacion', {
      id: idPK,
      tipo_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'NotificacionTipo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      importancia_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'ImportanciaTipo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      titulo: Sequelize.STRING(200),
      mensaje: Sequelize.TEXT,
      data_json: Sequelize.TEXT,
      link_url: Sequelize.STRING(512),
      tarea_id: {
        type: Sequelize.INTEGER,
        references: { model: 'Tarea', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      ausencia_id: {
        type: Sequelize.INTEGER,
        references: { model: 'Ausencia', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      asistencia_registro_id: {
        type: Sequelize.INTEGER,
        references: { model: 'AsistenciaRegistro', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      created_by_user_id: {
        type: Sequelize.INTEGER,
        references: { model: 'User', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      programada_at: Sequelize.DATE,
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now }
    });

    await queryInterface.createTable('NotificacionDestino', {
      id: idPK,
      notificacion_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Notificacion', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'User', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      feder_id: {
        type: Sequelize.INTEGER,
        references: { model: 'Feder', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now }
    });
    await queryInterface.addConstraint('NotificacionDestino', {
      fields: ['notificacion_id', 'user_id'],
      type: 'unique',
      name: 'UQ_NotifDestino_notif_user'
    });

    await queryInterface.createTable('NotificacionEnvio', {
      id: idPK,
      destino_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'NotificacionDestino', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      canal_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'CanalTipo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      proveedor_id: {
        type: Sequelize.INTEGER,
        references: { model: 'ProveedorTipo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      estado_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'EstadoEnvio', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      asunto_render: Sequelize.STRING(200),
      cuerpo_render: Sequelize.TEXT,
      data_render_json: Sequelize.TEXT,
      provider_msg_id: Sequelize.STRING(255),
      tracking_token: Sequelize.STRING(64),
      intento_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      ultimo_error: Sequelize.TEXT,
      queued_at: Sequelize.DATE,
      enviado_at: Sequelize.DATE,
      entregado_at: Sequelize.DATE,
      abierto_at: Sequelize.DATE,
      leido_at: Sequelize.DATE
    });
    await queryInterface.addConstraint('NotificacionEnvio', {
      fields: ['destino_id', 'canal_id'],
      type: 'unique',
      name: 'UQ_NotifEnvio_destino_canal'
    });

    await queryInterface.createTable('PushToken', {
      id: idPK,
      user_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'User', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      proveedor_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'ProveedorTipo', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      token: { type: Sequelize.TEXT, allowNull: false, unique: true },
      plataforma: Sequelize.STRING(30),
      device_info: Sequelize.STRING(255),
      last_seen_at: Sequelize.DATE,
      is_revocado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      ...tsCols
    });

    // ===== FK faltante: CelulaRolAsignacion.feder_id -> Feder.id
    await queryInterface.addConstraint('CelulaRolAsignacion', {
      fields: ['feder_id'],
      type: 'foreign key',
      name: 'FK_CelulaRolAsignacion_Feder',
      references: { table: 'Feder', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  },

  async down(queryInterface) {
    // Borrar en orden inverso (seguridad ante FKs)
    const drop = (t) => queryInterface.dropTable(t);

    // Notificaciones
    await drop('PushToken');
    await drop('NotificacionEnvio');
    await drop('NotificacionDestino');
    await drop('Notificacion');
    await drop('NotificacionPlantilla');
    await drop('NotificacionPreferencia');
    await drop('ProveedorTipo');
    await drop('EstadoEnvio');
    await drop('ImportanciaTipo');
    await drop('CanalTipo');
    await drop('NotificacionTipo');

    // Calendario
    await drop('EventoSync');
    await drop('GoogleWebhookCanal');
    await drop('CalendarioVinculo');
    await drop('GoogleCalendario');
    await drop('GoogleCuenta');
    await drop('EventoAsistente');
    await drop('Evento');
    await drop('CalendarioLocal');
    await drop('AsistenteTipo');
    await drop('SyncDireccionTipo');
    await drop('EventoTipo');
    await drop('VisibilidadTipo');
    await drop('CalendarioTipo');

    // Tareas
    await drop('TareaAdjunto');
    await drop('TareaComentario');
    await drop('TareaColaborador');
    await drop('TareaResponsable');
    await drop('Tarea');
    await drop('TareaAprobacionEstado');
    await drop('ComentarioTipo');
    await drop('UrgenciaTipo');
    await drop('ImpactoTipo');
    await drop('TareaEstado');

    // Clientes
    await drop('ClienteContacto');
    await drop('Cliente');
    await drop('ClienteEstado');
    await drop('ClienteTipo');

    // Ausencias
    await drop('Ausencia');
    await drop('MitadDiaTipo');
    await drop('AusenciaEstado');
    await drop('AusenciaTipo');

    // Asistencia
    await drop('AsistenciaRegistro');
    await drop('AsistenciaCierreMotivoTipo');
    await drop('AsistenciaOrigenTipo');

    // Feders / Cargos / Células
    await drop('FederCargo');
    await drop('FederModalidadDia');

    // Remove FK constraint before dropping Feder
    await queryInterface.removeConstraint('CelulaRolAsignacion', 'FK_CelulaRolAsignacion_Feder');

    await drop('Feder');
    await drop('DiaSemana');
    await drop('ModalidadTrabajoTipo');
    await drop('FederEstadoTipo');

    await drop('Cargo');
    await drop('CargoAmbito');

    await drop('CelulaRolAsignacion');
    await drop('Celula');
    await drop('CelulaRolTipo');
    await drop('CelulaEstado');

    // Auth
    await drop('JwtRevocacion');
    await drop('RolPermiso');
    await drop('UserRol');
    await drop('Permiso');
    await drop('Rol');
    await drop('User');
    await drop('AuthEmailDominio');
    await drop('Accion');
    await drop('Modulo');
    await drop('RolTipo');
  }
};
