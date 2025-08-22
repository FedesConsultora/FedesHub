// BuzonTipo.js
export default (sequelize, DataTypes) => {
  const BuzonTipo = sequelize.define('BuzonTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(60), allowNull: false },
    descripcion: { type: DataTypes.TEXT }
  }, { tableName: 'BuzonTipo', underscored: true, timestamps: false });
  return BuzonTipo;
};
