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
