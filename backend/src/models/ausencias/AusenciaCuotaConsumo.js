// backend/src/models/ausencias/AusenciaCuotaConsumo.js
export default (sequelize, DataTypes) => {
  const AusenciaCuotaConsumo = sequelize.define('AusenciaCuotaConsumo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cuota_id: { type: DataTypes.INTEGER, allowNull: false },
    ausencia_id: { type: DataTypes.INTEGER, allowNull: false },
    cantidad_consumida: { type: DataTypes.DECIMAL(10,2), allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'AusenciaCuotaConsumo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false });
  return AusenciaCuotaConsumo;
};
