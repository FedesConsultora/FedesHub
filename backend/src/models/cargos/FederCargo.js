// backend/src/models/cargos/FederCargo.js
export default (sequelize, DataTypes) => {
  const FederCargo = sequelize.define('FederCargo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    feder_id: { type: DataTypes.INTEGER, allowNull: false },
    cargo_id: { type: DataTypes.INTEGER, allowNull: false },
    es_principal: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    desde: { type: DataTypes.DATEONLY, allowNull: false },
    hasta: { type: DataTypes.DATEONLY },
    observacion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'FederCargo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false,
       indexes: [{ fields: ['feder_id','cargo_id','desde'] }] });
  return FederCargo;
};
