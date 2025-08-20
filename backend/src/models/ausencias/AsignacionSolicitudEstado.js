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
