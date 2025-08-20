// backend/src/models/auth/AuthEmailDominio.js
export default (sequelize, DataTypes) => {
  const AuthEmailDominio = sequelize.define('AuthEmailDominio', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    dominio: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    is_activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'AuthEmailDominio', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return AuthEmailDominio;
};
