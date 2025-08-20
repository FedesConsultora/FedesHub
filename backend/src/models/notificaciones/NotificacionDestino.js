// backend/src/models/notificaciones/NotificacionDestino.js
export default (sequelize, DataTypes) => {
  const NotificacionDestino = sequelize.define('NotificacionDestino', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    notificacion_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    feder_id: { type: DataTypes.INTEGER },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'NotificacionDestino', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false,
       indexes: [{ unique: true, fields: ['notificacion_id','user_id'] }] });
  return NotificacionDestino;
};