// backend/src/models/celulas/Celula.js
export default (sequelize, DataTypes) => {
  const Celula = sequelize.define('Celula', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    descripcion: { type: DataTypes.TEXT },
    estado_id: { type: DataTypes.INTEGER, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'Celula', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return Celula;
};
