// backend/src/models/clientes/ClienteContacto.js
export default (sequelize, DataTypes) => {
  const ClienteContacto = sequelize.define('ClienteContacto', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cliente_id: { type: DataTypes.INTEGER, allowNull: false },
    nombre: { type: DataTypes.STRING(160), allowNull: false },
    cargo: { type: DataTypes.STRING(120) },
    email: { type: DataTypes.STRING(255) },
    telefono: { type: DataTypes.STRING(40) },
    es_principal: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'ClienteContacto', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
       indexes: [{ fields: ['cliente_id'] }] });
  return ClienteContacto;
};