// backend/src/models/tareas/ComentarioTipo.js
export default (sequelize, DataTypes) => {
  const ComentarioTipo = sequelize.define('ComentarioTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'ComentarioTipo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return ComentarioTipo;
};

// backend/src/models/tareas/ImpactoTipo.js
export default (sequelize, DataTypes) => {
  const ImpactoTipo = sequelize.define('ImpactoTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    puntos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },
    descripcion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'ImpactoTipo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return ImpactoTipo;
};

// backend/src/models/tareas/Tarea.js
export default (sequelize, DataTypes) => {
  const Tarea = sequelize.define('Tarea', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cliente_id: { type: DataTypes.INTEGER, allowNull: false },
    hito_id: { type: DataTypes.INTEGER },
    tarea_padre_id: { type: DataTypes.INTEGER },
    titulo: { type: DataTypes.STRING(200), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    estado_id: { type: DataTypes.INTEGER, allowNull: false },
    creado_por_feder_id: { type: DataTypes.INTEGER, allowNull: false },
    requiere_aprobacion: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    aprobacion_estado_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    aprobado_por_user_id: { type: DataTypes.INTEGER },
    aprobado_at: { type: DataTypes.DATE },
    rechazado_por_user_id: { type: DataTypes.INTEGER },
    rechazado_at: { type: DataTypes.DATE },
    rechazo_motivo: { type: DataTypes.TEXT },
    fecha_inicio: { type: DataTypes.DATE },
    vencimiento: { type: DataTypes.DATE },
    impacto_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },
    urgencia_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 4 },
    prioridad_num: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    cliente_ponderacion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
    progreso_pct: { type: DataTypes.DECIMAL(5,2), allowNull: false, defaultValue: 0.00 },
    orden_kanban: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    is_archivada: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    finalizada_at: { type: DataTypes.DATE },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'Tarea', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
       indexes: [{ fields: ['cliente_id'] }, { fields: ['estado_id'] }, { fields: ['hito_id'] },
                 { fields: ['vencimiento'] }, { fields: ['prioridad_num'] }, { fields: ['tarea_padre_id'] }] });
  return Tarea;
};

// backend/src/models/tareas/TareaAdjunto.js

export default (sequelize, DataTypes) => {
  const TareaAdjunto = sequelize.define('TareaAdjunto', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tarea_id: { type: DataTypes.INTEGER, allowNull: false },
    comentario_id: { type: DataTypes.INTEGER },
    nombre: { type: DataTypes.STRING(255) },
    mime: { type: DataTypes.STRING(120) },
    tamano_bytes: { type: DataTypes.BIGINT },
    drive_file_id: { type: DataTypes.STRING(255) },
    drive_url: { type: DataTypes.STRING(512) },
    subido_por_feder_id: { type: DataTypes.INTEGER },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'TareaAdjunto', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false,
       indexes: [{ fields: ['tarea_id'] }] });
  return TareaAdjunto;
};

// backend/src/models/tareas/ImpactoTipo.js
export default (sequelize, DataTypes) => {
  const ImpactoTipo = sequelize.define('ImpactoTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    puntos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },
    descripcion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'ImpactoTipo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return ImpactoTipo;
};

// backend/src/models/tareas/ComentarioTipo.js
export default (sequelize, DataTypes) => {
  const ComentarioTipo = sequelize.define('ComentarioTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'ComentarioTipo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return ComentarioTipo;
};

// backend/src/models/tareas/TareaColaborador.js
export default (sequelize, DataTypes) => {
  const TareaColaborador = sequelize.define('TareaColaborador', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tarea_id: { type: DataTypes.INTEGER, allowNull: false },
    feder_id: { type: DataTypes.INTEGER, allowNull: false },
    rol: { type: DataTypes.STRING(100) },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'TareaColaborador', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false,
       indexes: [{ unique: true, fields: ['tarea_id','feder_id'] }] });
  return TareaColaborador;
};

// /backend/src/models/tareas/TareaChecklistItem.js
export default (sequelize, DataTypes) => {
  const TareaChecklistItem = sequelize.define('TareaChecklistItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tarea_id: { type: DataTypes.INTEGER, allowNull: false },
    titulo: { type: DataTypes.STRING(200), allowNull: false },
    is_done: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'TareaChecklistItem', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
       indexes: [{ fields: ['tarea_id','orden'] }] });
  return TareaChecklistItem;
};

// backend/src/models/tareas/TareaComentario.js
export default (sequelize, DataTypes) => {
  const TareaComentario = sequelize.define('TareaComentario', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tarea_id: { type: DataTypes.INTEGER, allowNull: false },
    feder_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo_id: { type: DataTypes.INTEGER, allowNull: false },
    contenido: { type: DataTypes.TEXT, allowNull: false },
    reply_to_id: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'TareaComentario', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
       indexes: [{ fields: ['tarea_id','created_at'] }] });
  return TareaComentario;
};

//backend/src/models/tareas/TareaComentarioMencion.js

export default (sequelize, DataTypes) => {
  const TareaComentarioMencion = sequelize.define('TareaComentarioMencion', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    comentario_id: { type: DataTypes.INTEGER, allowNull: false },
    feder_id: { type: DataTypes.INTEGER, allowNull: false },
  }, { tableName: 'TareaComentarioMencion', underscored: true, timestamps: false,
       indexes: [{ unique: true, fields: ['comentario_id','feder_id'] }] });
  return TareaComentarioMencion;
};
// backend/src/models/tareas/TareaEstado.js
export default (sequelize, DataTypes) => {
  const TareaEstado = sequelize.define('TareaEstado', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'TareaEstado', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return TareaEstado;
}; 

// /backend/src/models/tareas/TareaEtiqueta.js
export default (sequelize, DataTypes) => {
  const TareaEtiqueta = sequelize.define('TareaEtiqueta', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(60), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(120), allowNull: false },
    color_hex: { type: DataTypes.STRING(7) },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'TareaEtiqueta', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return TareaEtiqueta;
};
// /backend/src/models/tareas/TareaEtiqueta.js
export default (sequelize, DataTypes) => {
  const TareaEtiqueta = sequelize.define('TareaEtiqueta', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(60), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(120), allowNull: false },
    color_hex: { type: DataTypes.STRING(7) },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'TareaEtiqueta', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return TareaEtiqueta;
};
// /backend/src/models/tareas/TareaEtiquetaAsig.js
export default (sequelize, DataTypes) => {
  const TareaEtiquetaAsig = sequelize.define('TareaEtiquetaAsig', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tarea_id: { type: DataTypes.INTEGER, allowNull: false },
    etiqueta_id: { type: DataTypes.INTEGER, allowNull: false },
  }, { tableName: 'TareaEtiquetaAsig', underscored: true, timestamps: false,
       indexes: [{ unique: true, fields: ['tarea_id','etiqueta_id'] }] });
  return TareaEtiquetaAsig;
};
// backend/src/models/tareas/TareaFavorito.js

export default (sequelize, DataTypes) => {
  const TareaFavorito = sequelize.define('TareaFavorito', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tarea_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'TareaFavorito', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false,
       indexes: [{ unique: true, fields: ['tarea_id','user_id'] }] });
  return TareaFavorito;
};
// /backend/src/models/tareas/TareaRelacion.js
export default (sequelize, DataTypes) => {
  const TareaRelacion = sequelize.define('TareaRelacion', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tarea_id: { type: DataTypes.INTEGER, allowNull: false },
    relacionada_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo_id: { type: DataTypes.INTEGER, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, { tableName: 'TareaRelacion', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false,
       indexes: [{ unique: true, fields: ['tarea_id','relacionada_id','tipo_id'] }] });
  return TareaRelacion;
};
// /backend/src/models/tareas/TareaRelacionTipo.js
export default (sequelize, DataTypes) => {
  const TareaRelacionTipo = sequelize.define('TareaRelacionTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'TareaRelacionTipo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false });
  return TareaRelacionTipo;
};

// backend/src/models/tareas/TareaResponsable.js
export default (sequelize, DataTypes) => {
  const TareaResponsable = sequelize.define('TareaResponsable', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tarea_id: { type: DataTypes.INTEGER, allowNull: false },
    feder_id: { type: DataTypes.INTEGER, allowNull: false },
    es_lider: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    asignado_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'TareaResponsable', underscored: true, timestamps: false,
       indexes: [{ unique: true, fields: ['tarea_id','feder_id'] }] });
  return TareaResponsable;
};
/**
 * TareaSeguidor
 * Usuarios que siguen una tarea (para inbox/notificaciones).
 */
export default (sequelize, DataTypes) => {
  const TareaSeguidor = sequelize.define('TareaSeguidor', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tarea_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'TareaSeguidor', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false,
       indexes: [{ unique: true, fields: ['tarea_id','user_id'] }] });
  return TareaSeguidor;
};

// backend/src/models/tareas/UrgenciaTipo.js
export default (sequelize, DataTypes) => {
  const UrgenciaTipo = sequelize.define('UrgenciaTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    puntos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 4 },
    descripcion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'UrgenciaTipo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return UrgenciaTipo;
};
// backend/src/models/tareas/TareaKanbanPos.js
export default (sequelize, DataTypes) => {
  const TareaKanbanPos = sequelize.define('TareaKanbanPos', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tarea_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id:  { type: DataTypes.INTEGER, allowNull: false },
    stage_code:{ type: DataTypes.STRING(20), allowNull: false },
    pos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'TareaKanbanPos', underscored: true, timestamps: false,
       indexes: [{ fields: ['user_id','stage_code','pos'] }, { unique:true, fields: ['user_id','tarea_id'] }] });
  return TareaKanbanPos;
};
