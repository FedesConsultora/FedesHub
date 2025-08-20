// backend/src/models/calendario/AsistenteTipo.js
export default (sequelize, DataTypes) => {
  const AsistenteTipo = sequelize.define('AsistenteTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(60), allowNull: false },
    descripcion: { type: DataTypes.TEXT }
  }, { tableName: 'AsistenteTipo', underscored: true, timestamps: false });
  return AsistenteTipo;
};