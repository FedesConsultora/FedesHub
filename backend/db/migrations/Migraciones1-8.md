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
'use strict';

/** 202508211746410-0003-asistencia-modalidad-por-registro.cjs
 * 
 * Agrega modalidad_id a AsistenciaRegistro y hace backfill
 * desde el plan semanal (FederModalidadDia). Seed básico:
 * 'presencial' y 'home'.
*/

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1) Nueva columna
    await queryInterface.addColumn('AsistenciaRegistro', 'modalidad_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    // 2) FK -> ModalidadTrabajoTipo
    await queryInterface.addConstraint('AsistenciaRegistro', {
      fields: ['modalidad_id'],
      type: 'foreign key',
      name: 'fk_AsistenciaRegistro_modalidad',
      references: { table: 'ModalidadTrabajoTipo', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // 3) Índice (opcional pero útil para reportes)
    await queryInterface.addIndex('AsistenciaRegistro', ['modalidad_id'], {
      name: 'ix_AsistenciaRegistro_modalidad'
    });

    // 4) Semillas mínimas de modalidades
    await queryInterface.sequelize.query(`
      INSERT INTO "ModalidadTrabajoTipo"(codigo, nombre, created_at, updated_at)
      VALUES ('presencial','Presencial', NOW(), NOW())
      ON CONFLICT (codigo) DO NOTHING;
    `);
    await queryInterface.sequelize.query(`
      INSERT INTO "ModalidadTrabajoTipo"(codigo, nombre, created_at, updated_at)
      VALUES ('home','Home Office', NOW(), NOW())
      ON CONFLICT (codigo) DO NOTHING;
    `);

    // 5) Backfill: usar plan del día si existe, si no → 'presencial'
    await queryInterface.sequelize.query(`
      UPDATE "AsistenciaRegistro" ar
      SET modalidad_id = sub.modalidad_id
      FROM (
        SELECT ar2.id,
               (
                 SELECT fmd.modalidad_id
                 FROM "FederModalidadDia" fmd
                 WHERE fmd.feder_id = ar2.feder_id
                   AND fmd.dia_semana_id = EXTRACT(ISODOW FROM ar2.check_in_at)::int
                   AND fmd.is_activo = true
                 LIMIT 1
               ) AS modalidad_id
        FROM "AsistenciaRegistro" ar2
      ) AS sub
      WHERE ar.id = sub.id AND ar.modalidad_id IS NULL AND sub.modalidad_id IS NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      UPDATE "AsistenciaRegistro" ar
      SET modalidad_id = (SELECT id FROM "ModalidadTrabajoTipo" WHERE codigo='presencial')
      WHERE ar.modalidad_id IS NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('AsistenciaRegistro', 'ix_AsistenciaRegistro_modalidad').catch(()=>{});
    await queryInterface.removeConstraint('AsistenciaRegistro', 'fk_AsistenciaRegistro_modalidad').catch(()=>{});
    await queryInterface.removeColumn('AsistenciaRegistro', 'modalidad_id').catch(()=>{});
    // Nota: no borramos las seeds 'presencial'/'home' por si otros datos las usan.
  }
};
/** 202508211812250-0004-asistencia-constraints.cjs

*/
'use strict';
module.exports = {
  async up(queryInterface) {
    // 1) ÚNICO registro abierto por feder
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX "UQ_AsistenciaRegistro_abierto_por_feder"
      ON "AsistenciaRegistro"(feder_id)
      WHERE check_out_at IS NULL;
    `);

    // 2) Cronología consistente
    await queryInterface.sequelize.query(`
      ALTER TABLE "AsistenciaRegistro"
      ADD CONSTRAINT "ck_AsistenciaRegistro_chronology"
      CHECK (check_out_at IS NULL OR check_out_at >= check_in_at);
    `);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE "AsistenciaRegistro"
      DROP CONSTRAINT IF EXISTS "ck_AsistenciaRegistro_chronology";
    `);
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "UQ_AsistenciaRegistro_abierto_por_feder";
    `);
  }
};
// 202508220417420-0005-add-celula-profile-fields.cjs
'use strict';

module.exports = {
  async up (q, S) {
    // 1) Agregar slug como NULL y SIN unique (para evitar conflictos)
    const desc = await q.describeTable('Celula');
    if (!desc.slug) {
      await q.addColumn('Celula', 'slug', { type: S.STRING(140), allowNull: true });
    }

    // 2) Backfill de slug
    await q.sequelize.query(`
      UPDATE "Celula"
      SET slug = LOWER(regexp_replace(nombre, '[^a-zA-Z0-9]+','-','g')) || '-' || id
      WHERE slug IS NULL OR slug = ''
    `);

    // 3) NOT NULL + UNIQUE (como constraint con nombre explícito)
    await q.changeColumn('Celula', 'slug', { type: S.STRING(140), allowNull: false });
    await q.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UQ_Celula_slug'
        ) THEN
          ALTER TABLE "Celula" ADD CONSTRAINT "UQ_Celula_slug" UNIQUE (slug);
        END IF;
      END$$;
    `);

    // 4) Otras columnas
    if (!desc.perfil_md)  await q.addColumn('Celula','perfil_md',  { type: S.TEXT });
    if (!desc.avatar_url) await q.addColumn('Celula','avatar_url', { type: S.STRING(512) });
    if (!desc.cover_url)  await q.addColumn('Celula','cover_url',  { type: S.STRING(512) });
  },

  async down (q) {
    await q.sequelize.query(`ALTER TABLE "Celula" DROP CONSTRAINT IF EXISTS "UQ_Celula_slug"`);
    await q.removeColumn('Celula','cover_url').catch(()=>{});
    await q.removeColumn('Celula','avatar_url').catch(()=>{});
    await q.removeColumn('Celula','perfil_md').catch(()=>{});
    await q.removeColumn('Celula','slug').catch(()=>{});
  }
};
// 202508220519010-0006-tareas-core.cjs
// NOTA: El core de Tareas ya existe en 0001-initial-schema.cjs.
// Esta migración queda como NO-OP idempotente: asegura solo índices útiles si faltan.

'use strict';

module.exports = {
  async up (q, Sequelize) {
    // helpers
    const safeIndex = async (table, name, cols) => {
      try {
        await q.sequelize.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname=${q.sequelize.escape(name)}
            ) THEN
              CREATE INDEX "${name}" ON "${table}" (${cols});
            END IF;
          END$$;
        `);
      } catch {}
    };

    // Verificar que exista Tarea (creada por 0001)
    try { await q.describeTable('Tarea'); }
    catch {
      throw new Error('[0800-tareas-core] Falta la tabla Tarea (debe correr 0001 primero).');
    }

    // Índices “por si faltan”
    await safeIndex('Tarea', 'ix_Tarea_cliente_id',        '"cliente_id"');
    await safeIndex('Tarea', 'ix_Tarea_estado_id',         '"estado_id"');
    await safeIndex('Tarea', 'ix_Tarea_vencimiento',       '"vencimiento"');
    await safeIndex('Tarea', 'ix_Tarea_prioridad_num',     '"prioridad_num"');
    await safeIndex('Tarea', 'ix_Tarea_tarea_padre_id',    '"tarea_padre_id"');

    await safeIndex('TareaResponsable', 'ix_TareaResp_tarea_feder', '"tarea_id","feder_id"');
    await safeIndex('TareaColaborador', 'ix_TareaColab_tarea_feder', '"tarea_id","feder_id"');
    await safeIndex('TareaComentario', 'ix_TareaComent_tarea_created', '"tarea_id","created_at"');
    await safeIndex('TareaAdjunto', 'ix_TareaAdjunto_tarea', '"tarea_id"');
  },

  async down () {
    // No hacemos nada: no-op
  }
};
// 202508221558080-0007-notificaciones-inboxes-separados.cjs


'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, JSONB, BOOLEAN, DATE } = Sequelize;

    // 0) Tablas auxiliares necesarias (idempotentes)
    await queryInterface.createTable('BuzonTipo', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      codigo: { type: STRING(30), allowNull: false, unique: true },
      nombre: { type: STRING(60), allowNull: false },
      descripcion: { type: TEXT }
    }).catch(()=>{});

    await queryInterface.createTable('ChatCanal', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      tipo: { type: STRING(20), allowNull: false }, // p.ej.: 'dm' | 'team' | 'project'
      nombre: { type: STRING(120) },
      slug: { type: STRING(120), unique: true },
      is_archivado: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_by_user_id: { type: INTEGER },
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn('now') }
    }).catch(()=>{});
    await queryInterface.addIndex('ChatCanal', ['tipo']).catch(()=>{});

    // 1) NotificacionTipo: agregar columnas (NULL primero para backfill)
    await queryInterface.addColumn('NotificacionTipo', 'buzon_id', { type: INTEGER, allowNull: true }).catch(()=>{});
    await queryInterface.addColumn('NotificacionTipo', 'canales_default_json', { type: JSONB, allowNull: true }).catch(()=>{});

    // 1.a) Semilla mínima de buzones (idempotente)
    await queryInterface.sequelize.query(`
      INSERT INTO "BuzonTipo"(codigo,nombre) VALUES
        ('tareas','Tareas'),
        ('chat','Chat'),
        ('calendario','Calendario/Reuniones')
      ON CONFLICT (codigo) DO NOTHING;
    `);

    // 1.b) Backfill de buzon_id según codigo (sin :replacements)
    await queryInterface.sequelize.query(`
      UPDATE "NotificacionTipo"
      SET buzon_id = (SELECT id FROM "BuzonTipo" WHERE codigo='tareas')
      WHERE buzon_id IS NULL AND (codigo LIKE 'tarea_%' OR codigo LIKE 'ausencia_%' OR codigo='sistema');
    `);
    await queryInterface.sequelize.query(`
      UPDATE "NotificacionTipo"
      SET buzon_id = (SELECT id FROM "BuzonTipo" WHERE codigo='chat')
      WHERE buzon_id IS NULL AND codigo LIKE 'chat_%';
    `);
    await queryInterface.sequelize.query(`
      UPDATE "NotificacionTipo"
      SET buzon_id = (SELECT id FROM "BuzonTipo" WHERE codigo='calendario')
      WHERE buzon_id IS NULL AND (codigo LIKE 'evento_%' OR codigo='recordatorio');
    `);

    // 1.c) Defaults de canales si faltan
    await queryInterface.sequelize.query(`
      UPDATE "NotificacionTipo" 
      SET canales_default_json = '["in_app","email"]'::jsonb
      WHERE canales_default_json IS NULL 
        AND (codigo LIKE 'tarea_%' OR codigo LIKE 'ausencia_%' OR codigo LIKE 'evento_%' OR codigo='sistema');
    `);
    await queryInterface.sequelize.query(`
      UPDATE "NotificacionTipo" 
      SET canales_default_json = '["in_app"]'::jsonb
      WHERE canales_default_json IS NULL AND codigo LIKE 'chat_%';
    `);

    // 1.d) Hacer NOT NULL + FK
    await queryInterface.changeColumn('NotificacionTipo', 'buzon_id', { type: INTEGER, allowNull: false }).catch(()=>{});
    await queryInterface.addConstraint('NotificacionTipo', {
      fields: ['buzon_id'],
      type: 'foreign key',
      name: 'fk_notiftipo_buzon',
      references: { table: 'BuzonTipo', field: 'id' },
      onUpdate: 'cascade',
      onDelete: 'restrict'
    }).catch(()=>{});

    // 1.e) Asegurar canal 'push'
    await queryInterface.sequelize.query(`
      INSERT INTO "CanalTipo"(codigo,nombre) 
      SELECT 'push','Push' 
      WHERE NOT EXISTS (SELECT 1 FROM "CanalTipo" WHERE codigo='push');
    `);

    // 2) Notificacion: nuevos campos + índices
    await queryInterface.addColumn('Notificacion', 'hilo_key', { type: STRING(120) }).catch(()=>{});
    await queryInterface.addColumn('Notificacion', 'evento_id', { type: INTEGER, allowNull: true }).catch(()=>{});
    await queryInterface.addColumn('Notificacion', 'chat_canal_id', { type: INTEGER, allowNull: true }).catch(()=>{});
    await queryInterface.addIndex('Notificacion', ['evento_id']).catch(()=>{});
    await queryInterface.addIndex('Notificacion', ['chat_canal_id']).catch(()=>{});
    await queryInterface.addIndex('Notificacion', ['hilo_key']).catch(()=>{});

    // 2.a) FKs (Evento y ChatCanal)
    await queryInterface.addConstraint('Notificacion', {
      fields: ['chat_canal_id'],
      type: 'foreign key',
      name: 'fk_notif_chatcanal',
      references: { table: 'ChatCanal', field: 'id' },
      onUpdate: 'cascade',
      onDelete: 'set null'
    }).catch(()=>{});
    await queryInterface.addConstraint('Notificacion', {
      fields: ['evento_id'],
      type: 'foreign key',
      name: 'fk_notif_evento',
      references: { table: 'Evento', field: 'id' },
      onUpdate: 'cascade',
      onDelete: 'set null'
    }).catch(()=>{});

    // 3) NotificacionDestino: nuevos campos + índices
    await queryInterface.addColumn('NotificacionDestino', 'in_app_seen_at', { type: DATE }).catch(()=>{});
    await queryInterface.addColumn('NotificacionDestino', 'read_at', { type: DATE }).catch(()=>{});
    await queryInterface.addColumn('NotificacionDestino', 'dismissed_at', { type: DATE }).catch(()=>{});
    await queryInterface.addColumn('NotificacionDestino', 'archived_at', { type: DATE }).catch(()=>{});
    await queryInterface.addColumn('NotificacionDestino', 'pin_orden', { type: INTEGER }).catch(()=>{});
    await queryInterface.addIndex('NotificacionDestino', ['user_id','archived_at']).catch(()=>{});
    await queryInterface.addIndex('NotificacionDestino', ['user_id','read_at']).catch(()=>{});
    await queryInterface.addIndex('NotificacionDestino', ['user_id','pin_orden']).catch(()=>{});
  },

  async down (queryInterface) {
    // NotificacionDestino
    await queryInterface.removeIndex('NotificacionDestino', ['user_id','pin_orden']).catch(()=>{});
    await queryInterface.removeIndex('NotificacionDestino', ['user_id','read_at']).catch(()=>{});
    await queryInterface.removeIndex('NotificacionDestino', ['user_id','archived_at']).catch(()=>{});
    for (const col of ['pin_orden','archived_at','dismissed_at','read_at','in_app_seen_at']) {
      await queryInterface.removeColumn('NotificacionDestino', col).catch(()=>{});
    }

    // Notificacion
    await queryInterface.removeIndex('Notificacion', ['hilo_key']).catch(()=>{});
    await queryInterface.removeIndex('Notificacion', ['chat_canal_id']).catch(()=>{});
    await queryInterface.removeIndex('Notificacion', ['evento_id']).catch(()=>{});
    await queryInterface.removeConstraint('Notificacion', 'fk_notif_chatcanal').catch(()=>{});
    await queryInterface.removeConstraint('Notificacion', 'fk_notif_evento').catch(()=>{});
    for (const col of ['chat_canal_id','evento_id','hilo_key']) {
      await queryInterface.removeColumn('Notificacion', col).catch(()=>{});
    }

    // NotificacionTipo
    await queryInterface.removeConstraint('NotificacionTipo', 'fk_notiftipo_buzon').catch(()=>{});
    await queryInterface.removeColumn('NotificacionTipo', 'canales_default_json').catch(()=>{});
    await queryInterface.removeColumn('NotificacionTipo', 'buzon_id').catch(()=>{});

    // Auxiliares
    await queryInterface.dropTable('ChatCanal').catch(()=>{});
    await queryInterface.dropTable('BuzonTipo').catch(()=>{});
  }
};
// 202508320295500-0008-tareas-campos-extra.cjs
'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    // Campos faltantes según tu modelo y seeder
    await queryInterface.addColumn('Tarea', 'hito_id', {
      type: Sequelize.INTEGER,
      allowNull: true
      // Si luego creás tabla Hito, acá podés agregar la FK
      // references: { model: 'Hito', key: 'id' }, onUpdate:'CASCADE', onDelete:'SET NULL'
    });

    await queryInterface.addColumn('Tarea', 'fecha_inicio', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Tarea', 'progreso_pct', {
      type: Sequelize.DECIMAL(5,2),
      allowNull: false,
      defaultValue: 0.00
    });

    await queryInterface.addColumn('Tarea', 'orden_kanban', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    // Índice que tu modelo ya declara
    await queryInterface.addIndex('Tarea', ['hito_id']);
  },

  async down (queryInterface) {
    await queryInterface.removeIndex('Tarea', ['hito_id']).catch(()=>{});
    await queryInterface.removeColumn('Tarea', 'orden_kanban').catch(()=>{});
    await queryInterface.removeColumn('Tarea', 'progreso_pct').catch(()=>{});
    await queryInterface.removeColumn('Tarea', 'fecha_inicio').catch(()=>{});
    await queryInterface.removeColumn('Tarea', 'hito_id').catch(()=>{});
  }
};
