// backend/src/models/ausencias/AusenciaCuota.js
export default (sequelize, DataTypes) => {
  const AusenciaCuota = sequelize.define('AusenciaCuota', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    feder_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo_id: { type: DataTypes.INTEGER, allowNull: false },
    unidad_id: { type: DataTypes.INTEGER, allowNull: false },
    cantidad_total: { type: DataTypes.DECIMAL(10,2), allowNull: false },
    vigencia_desde: { type: DataTypes.DATEONLY, allowNull: false },
    vigencia_hasta: { type: DataTypes.DATEONLY, allowNull: false },
    asignado_por_user_id: { type: DataTypes.INTEGER },
    comentario: { type: DataTypes.TEXT },
    is_activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'AusenciaCuota', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return AusenciaCuota;
};
