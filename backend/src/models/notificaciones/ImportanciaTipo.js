// backend/src/models/notificaciones/ImportanciaTipo.js
export default (sequelize, DataTypes) => {
  const ImportanciaTipo = sequelize.define('ImportanciaTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(60), allowNull: false },
    orden: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 2 }
  }, { tableName: 'ImportanciaTipo', underscored: true, timestamps: false });
  return ImportanciaTipo;
};