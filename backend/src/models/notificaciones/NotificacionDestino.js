// backend/src/models/notificaciones/NotificacionDestino.js

export default (sequelize, DataTypes) => {
  const NotificacionDestino = sequelize.define('NotificacionDestino', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    notificacion_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    feder_id: { type: DataTypes.INTEGER },

    // Estado por usuario (para inbox por bandeja)
    in_app_seen_at: { type: DataTypes.DATE },             // << nuevo (vista previa en burbuja / panel)
    read_at: { type: DataTypes.DATE },                    // << nuevo (marcar como leído)
    dismissed_at: { type: DataTypes.DATE },               
    archived_at: { type: DataTypes.DATE },                
    pin_orden: { type: DataTypes.INTEGER },               

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'NotificacionDestino', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false,
       indexes: [
         { unique: true, fields: ['notificacion_id','user_id'] },
         { fields: ['user_id','archived_at'] },
         { fields: ['user_id','read_at'] },
         { fields: ['user_id','pin_orden'] }
       ] });
  return NotificacionDestino;
};
