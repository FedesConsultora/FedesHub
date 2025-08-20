// backend/src/models/asistencia/AsistenciaRegistro.js
export default (sequelize, DataTypes) => {
  const AsistenciaRegistro = sequelize.define('AsistenciaRegistro', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    feder_id: { type: DataTypes.INTEGER, allowNull: false },
    check_in_at: { type: DataTypes.DATE, allowNull: false },
    check_in_origen_id: { type: DataTypes.INTEGER },
    check_out_at: { type: DataTypes.DATE },
    check_out_origen_id: { type: DataTypes.INTEGER },
    cierre_motivo_id: { type: DataTypes.INTEGER },
    comentario: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'AsistenciaRegistro', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
       indexes: [{ fields: ['feder_id','check_in_at'] }, { fields: ['check_out_at'] }] });
  return AsistenciaRegistro;
};
