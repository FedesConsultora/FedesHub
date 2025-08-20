// backend/src/models/ausencias/MitadDiaTipo.js
export default (sequelize, DataTypes) => {
  const MitadDiaTipo = sequelize.define('MitadDiaTipo', {
    id: { type: DataTypes.SMALLINT, primaryKey: true },
    codigo: { type: DataTypes.STRING(10), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(20), allowNull: false }
  }, { tableName: 'MitadDiaTipo', underscored: true, timestamps: false });
  return MitadDiaTipo;
};
