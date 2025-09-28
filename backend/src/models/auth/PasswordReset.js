// backend/src/models/auth/PasswordReset.js
export default (sequelize, DataTypes) => {
  const PasswordReset = sequelize.define('PasswordReset', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    token: { type: DataTypes.STRING(128), allowNull: false, unique: true },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    used_at: { type: DataTypes.DATE },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'PasswordReset',
    underscored: true,
    timestamps: false
  });
  return PasswordReset;
};
