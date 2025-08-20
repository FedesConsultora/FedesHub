// backend/src/models/notificaciones/ProveedorTipo.js
export default (sequelize, DataTypes) => {
  const ProveedorTipo = sequelize.define('ProveedorTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(60), allowNull: false },
    descripcion: { type: DataTypes.TEXT }
  }, { tableName: 'ProveedorTipo', underscored: true, timestamps: false });
  return ProveedorTipo;
};