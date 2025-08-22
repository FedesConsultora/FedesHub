// backend/src/models/notificaciones/EstadoEnvio.js

export default (sequelize, DataTypes) => {
  const EstadoEnvio = sequelize.define('EstadoEnvio', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(60), allowNull: false },
    descripcion: { type: DataTypes.TEXT }
  }, { tableName: 'EstadoEnvio', underscored: true, timestamps: false });
  return EstadoEnvio;
};
