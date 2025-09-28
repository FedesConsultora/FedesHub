// backend/src/models/feders/FederBanco.js
export default (sequelize, DataTypes) => {
  const FederBanco = sequelize.define('FederBanco', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    feder_id: { type: DataTypes.INTEGER, allowNull: false },
    banco_nombre: { type: DataTypes.STRING(120) },
    cbu_enc: { type: DataTypes.TEXT, allowNull: false },  // JSON AES-GCM
    alias_enc: { type: DataTypes.TEXT },                  // JSON AES-GCM
    titular_nombre: { type: DataTypes.STRING(180) },
    es_principal: { type: DataTypes.BOOLEAN, defaultValue: true },

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'FederBanco',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return FederBanco;
};
