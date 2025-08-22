// /backend/src/models/tareas/TareaRelacionTipo.js
export default (sequelize, DataTypes) => {
  const TareaRelacionTipo = sequelize.define('TareaRelacionTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'TareaRelacionTipo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false });
  return TareaRelacionTipo;
};
