// backend/src/models/notificaciones/NotificacionPreferencia.js
export default (sequelize, DataTypes) => {
  const NotificacionPreferencia = sequelize.define('NotificacionPreferencia', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo_id: { type: DataTypes.INTEGER, allowNull: false },
    canal_id: { type: DataTypes.INTEGER, allowNull: false },
    is_habilitado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'NotificacionPreferencia', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
       indexes: [{ unique: true, fields: ['user_id','tipo_id','canal_id'] }] });
  return NotificacionPreferencia;
};
