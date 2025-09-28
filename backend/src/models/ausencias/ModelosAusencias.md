// backend/src/models/ausencias/AsignacionSolicitudEstado.js
export default (sequelize, DataTypes) => {
  const AsignacionSolicitudEstado = sequelize.define('AsignacionSolicitudEstado', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(30), allowNull: false, unique: true }, // 'pendiente','aprobada','rechazada'
    nombre: { type: DataTypes.STRING(80), allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'AsignacionSolicitudEstado', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false });
  return AsignacionSolicitudEstado;
};
// backend/src/models/ausencias/Ausencia.js
export default (sequelize, DataTypes) => {
  const Ausencia = sequelize.define('Ausencia', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    feder_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo_id: { type: DataTypes.INTEGER, allowNull: false },
    estado_id: { type: DataTypes.INTEGER, allowNull: false },
    fecha_desde: { type: DataTypes.DATEONLY, allowNull: false },
    fecha_hasta: { type: DataTypes.DATEONLY, allowNull: false },
    es_medio_dia: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    mitad_dia_id: { type: DataTypes.SMALLINT },
    duracion_horas: { type: DataTypes.DECIMAL(10,2) }, // NUEVO (para unidad=horas)
    motivo: { type: DataTypes.TEXT },
    comentario_admin: { type: DataTypes.TEXT },
    aprobado_por_user_id: { type: DataTypes.INTEGER },
    aprobado_at: { type: DataTypes.DATE },
    denegado_motivo: { type: DataTypes.TEXT },
    creado_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    actualizado_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'Ausencia', underscored: true, timestamps: false });
  return Ausencia;
};
// backend/src/models/ausencias/AusenciaAsignacionSolicitud.js
export default (sequelize, DataTypes) => {
  const AusenciaAsignacionSolicitud = sequelize.define('AusenciaAsignacionSolicitud', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    feder_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo_id: { type: DataTypes.INTEGER, allowNull: false },
    unidad_id: { type: DataTypes.INTEGER, allowNull: false },
    cantidad_solicitada: { type: DataTypes.DECIMAL(10,2), allowNull: false },
    vigencia_desde: { type: DataTypes.DATEONLY, allowNull: false },
    vigencia_hasta: { type: DataTypes.DATEONLY, allowNull: false },
    motivo: { type: DataTypes.TEXT },
    estado_id: { type: DataTypes.INTEGER, allowNull: false },
    aprobado_por_user_id: { type: DataTypes.INTEGER },
    aprobado_at: { type: DataTypes.DATE },
    comentario_admin: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'AusenciaAsignacionSolicitud', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return AusenciaAsignacionSolicitud;
};
// backend/src/models/ausencias/AusenciaCuota.js
export default (sequelize, DataTypes) => {
  const AusenciaCuota = sequelize.define('AusenciaCuota', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    feder_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo_id: { type: DataTypes.INTEGER, allowNull: false },
    unidad_id: { type: DataTypes.INTEGER, allowNull: false },
    cantidad_total: { type: DataTypes.DECIMAL(10,2), allowNull: false },
    vigencia_desde: { type: DataTypes.DATEONLY, allowNull: false },
    vigencia_hasta: { type: DataTypes.DATEONLY, allowNull: false },
    asignado_por_user_id: { type: DataTypes.INTEGER },
    comentario: { type: DataTypes.TEXT },
    is_activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'AusenciaCuota', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return AusenciaCuota;
};
// backend/src/models/ausencias/AusenciaCuotaConsumo.js
export default (sequelize, DataTypes) => {
  const AusenciaCuotaConsumo = sequelize.define('AusenciaCuotaConsumo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cuota_id: { type: DataTypes.INTEGER, allowNull: false },
    ausencia_id: { type: DataTypes.INTEGER, allowNull: false },
    cantidad_consumida: { type: DataTypes.DECIMAL(10,2), allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'AusenciaCuotaConsumo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false });
  return AusenciaCuotaConsumo;
};
// backend/src/models/ausencias/AusenciaEstado.js
export default (sequelize, DataTypes) => {
  const AusenciaEstado = sequelize.define('AusenciaEstado', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'AusenciaEstado', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return AusenciaEstado;
};
// backend/src/models/ausencias/AusenciaTipo.js
export default (sequelize, DataTypes) => {
  const AusenciaTipo = sequelize.define('AusenciaTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    unidad_id: { type: DataTypes.INTEGER, allowNull: false },          // NUEVO
    requiere_asignacion: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }, // NUEVO
    permite_medio_dia: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },  // NUEVO
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'AusenciaTipo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return AusenciaTipo;
};
// backend/src/models/ausencias/MitadDiaTipo.js
export default (sequelize, DataTypes) => {
  const MitadDiaTipo = sequelize.define('MitadDiaTipo', {
    id: { type: DataTypes.SMALLINT, primaryKey: true },
    codigo: { type: DataTypes.STRING(10), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(20), allowNull: false }
  }, { tableName: 'MitadDiaTipo', underscored: true, timestamps: false });
  return MitadDiaTipo;
};
