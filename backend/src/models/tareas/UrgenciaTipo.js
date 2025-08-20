// backend/src/models/tareas/UrgenciaTipo.js
export default (sequelize, DataTypes) => {
  const UrgenciaTipo = sequelize.define('UrgenciaTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    puntos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 4 },
    descripcion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'UrgenciaTipo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return UrgenciaTipo;
};
