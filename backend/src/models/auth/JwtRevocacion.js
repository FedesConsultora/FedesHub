// backend/src/models/auth/JwtRevocacion.js
export default (sequelize, DataTypes) => {
  const JwtRevocacion = sequelize.define('JwtRevocacion', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    jti: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    user_id: { type: DataTypes.INTEGER },
    revoked_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    motivo: { type: DataTypes.TEXT }
  }, { tableName: 'JwtRevocacion', underscored: true, timestamps: false });
  return JwtRevocacion;
};
