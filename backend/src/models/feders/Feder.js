// backend/src/models/feders/Feder.js
export default (sequelize, DataTypes) => {
  const Feder = sequelize.define('Feder', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER },
    celula_id: { type: DataTypes.INTEGER },
    estado_id: { type: DataTypes.INTEGER, allowNull: false },
    nombre: { type: DataTypes.STRING(120), allowNull: false },
    apellido: { type: DataTypes.STRING(120), allowNull: false },
    telefono: { type: DataTypes.STRING(30) },
    avatar_url: { type: DataTypes.STRING(512) },
    fecha_ingreso: { type: DataTypes.DATEONLY },
    fecha_egreso: { type: DataTypes.DATEONLY },
    is_activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'Feder', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return Feder;
};