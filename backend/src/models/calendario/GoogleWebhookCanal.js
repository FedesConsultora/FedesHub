// backend/src/models/calendario/GoogleWebhookCanal.js
export default (sequelize, DataTypes) => {
  const GoogleWebhookCanal = sequelize.define('GoogleWebhookCanal', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cuenta_id: { type: DataTypes.INTEGER, allowNull: false },
    channel_id: { type: DataTypes.STRING(200), allowNull: false, unique: true },
    resource_id: { type: DataTypes.STRING(200), allowNull: false },
    resource_uri: { type: DataTypes.TEXT },
    expiration_at: { type: DataTypes.DATE, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    is_activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
  }, { tableName: 'GoogleWebhookCanal', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false,
       indexes: [{ fields: ['cuenta_id'] }, { fields: ['resource_id'] }] });
  return GoogleWebhookCanal;
};
