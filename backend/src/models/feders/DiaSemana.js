// backend/src/models/feders/DiaSemana.js
export default (sequelize, DataTypes) => {
  const DiaSemana = sequelize.define('DiaSemana', {
    id: { type: DataTypes.SMALLINT, primaryKey: true },
    codigo: { type: DataTypes.STRING(10), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(20), allowNull: false }
  }, { tableName: 'DiaSemana', underscored: true, timestamps: false });
  return DiaSemana;
};
