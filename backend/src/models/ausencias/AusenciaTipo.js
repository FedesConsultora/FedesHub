// backend/src/models/ausencias/AusenciaTipo.js
export default (sequelize, DataTypes) => {
  const AusenciaTipo = sequelize.define('AusenciaTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    unidad_id: { type: DataTypes.INTEGER, allowNull: false },
    icon: { type: DataTypes.STRING(50) },
    color: { type: DataTypes.STRING(20) },
    requiere_asignacion: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    permite_medio_dia: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },  // NUEVO
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'AusenciaTipo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return AusenciaTipo;
};
