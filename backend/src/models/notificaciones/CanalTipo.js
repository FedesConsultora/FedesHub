// backend/src/models/notificaciones/CanalTipo.js
export default (sequelize, DataTypes) => {
  const CanalTipo = sequelize.define('CanalTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(60), allowNull: false },
    descripcion: { type: DataTypes.TEXT }
  }, { tableName: 'CanalTipo', underscored: true, timestamps: false });
  return CanalTipo;
};
