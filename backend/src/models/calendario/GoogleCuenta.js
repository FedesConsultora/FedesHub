// backend/src/models/calendario/GoogleCuenta.js
export default (sequelize, DataTypes) => {
  const GoogleCuenta = sequelize.define('GoogleCuenta', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    google_user_id: { type: DataTypes.STRING(128), allowNull: false, unique: true },
    email: { type: DataTypes.STRING(255), allowNull: false },
    refresh_token_enc: { type: DataTypes.TEXT },
    token_scope: { type: DataTypes.TEXT },
    connected_at: { type: DataTypes.DATE },
    revoked_at: { type: DataTypes.DATE },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'GoogleCuenta', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return GoogleCuenta;
};
