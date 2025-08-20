// backend/src/models/auth/RolPermiso.js
export default (sequelize, DataTypes) => {
  const RolPermiso = sequelize.define('RolPermiso', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    rol_id: { type: DataTypes.INTEGER, allowNull: false },
    permiso_id: { type: DataTypes.INTEGER, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'RolPermiso', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false,
       indexes: [{ unique: true, fields: ['rol_id','permiso_id'] }] });
  return RolPermiso;
};
