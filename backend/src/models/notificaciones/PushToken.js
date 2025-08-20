// backend/src/models/notificaciones/PushToken.js
export default (sequelize, DataTypes) => {
  const PushToken = sequelize.define('PushToken', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    proveedor_id: { type: DataTypes.INTEGER, allowNull: false },
    token: { type: DataTypes.TEXT, allowNull: false, unique: true },
    plataforma: { type: DataTypes.STRING(30) },
    device_info: { type: DataTypes.STRING(255) },
    last_seen_at: { type: DataTypes.DATE },
    is_revocado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'PushToken', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return PushToken;
};