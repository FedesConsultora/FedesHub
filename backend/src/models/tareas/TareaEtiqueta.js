// /backend/src/models/tareas/TareaEtiqueta.js
export default (sequelize, DataTypes) => {
  const TareaEtiqueta = sequelize.define('TareaEtiqueta', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(60), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(120), allowNull: false },
    color_hex: { type: DataTypes.STRING(7) },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'TareaEtiqueta', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return TareaEtiqueta;
};
