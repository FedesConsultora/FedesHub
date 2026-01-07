// backend/src/models/clientes/Cliente.js
export default (sequelize, DataTypes) => {
  const Cliente = sequelize.define('Cliente', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tipo_id: { type: DataTypes.INTEGER, allowNull: false },
    estado_id: { type: DataTypes.INTEGER, allowNull: false },
    nombre: { type: DataTypes.STRING(160), allowNull: false, unique: true },
    alias: { type: DataTypes.STRING(120) },
    email: { type: DataTypes.STRING(255) },
    telefono: { type: DataTypes.STRING(40) },
    sitio_web: { type: DataTypes.STRING(255) },
    descripcion: { type: DataTypes.TEXT },
    ponderacion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
    color: { type: DataTypes.STRING(7), allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'Cliente', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
    indexes: [{ fields: ['tipo_id'] }, { fields: ['estado_id'] }, { fields: ['ponderacion'] }]
  });
  return Cliente;
};
