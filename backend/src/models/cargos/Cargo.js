// backend/src/models/cargos/Cargo.js
export default (sequelize, DataTypes) => {
  const Cargo = sequelize.define('Cargo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    descripcion: { type: DataTypes.TEXT },
    ambito_id: { type: DataTypes.INTEGER, allowNull: false },
    is_activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'Cargo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return Cargo;
};
