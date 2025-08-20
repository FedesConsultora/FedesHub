// backend/src/models/auth/Permiso.js
export default (sequelize, DataTypes) => {
  const Permiso = sequelize.define('Permiso', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    modulo_id: { type: DataTypes.INTEGER, allowNull: false },
    accion_id: { type: DataTypes.INTEGER, allowNull: false },
    nombre: { type: DataTypes.STRING(150), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'Permiso', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
      indexes: [{ unique: true, fields: ['modulo_id','accion_id'] }] 
    });
  return Permiso;
};
