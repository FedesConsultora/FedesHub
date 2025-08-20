// backend/src/models/calendario/SyncDireccionTipo.js
export default (sequelize, DataTypes) => {
  const SyncDireccionTipo = sequelize.define('SyncDireccionTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(60), allowNull: false },
    descripcion: { type: DataTypes.TEXT }
  }, { tableName: 'SyncDireccionTipo', underscored: true, timestamps: false });
  return SyncDireccionTipo;
};
