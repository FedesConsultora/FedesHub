// backend/src/models/ausencias/AusenciaUnidadTipo.js
export default (sequelize, DataTypes) => {
  const AusenciaUnidadTipo = sequelize.define('AusenciaUnidadTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(10), allowNull: false, unique: true }, // 'dias' | 'horas'
    nombre: { type: DataTypes.STRING(30), allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'AusenciaUnidadTipo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return AusenciaUnidadTipo;
};
