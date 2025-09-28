// backend/src/models/feders/FederEmergencia.js
export default (sequelize, DataTypes) => {
  const FederEmergencia = sequelize.define('FederEmergencia', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    feder_id: { type: DataTypes.INTEGER, allowNull: false },
    nombre: { type: DataTypes.STRING(180), allowNull: false },
    parentesco: { type: DataTypes.STRING(80) },
    telefono: { type: DataTypes.STRING(40) },
    email: { type: DataTypes.STRING(180) },

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'FederEmergencia',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return FederEmergencia;
};
