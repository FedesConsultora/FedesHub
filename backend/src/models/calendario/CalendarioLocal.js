// backend/src/models/calendario/CalendarioLocal.js
export default (sequelize, DataTypes) => {
  const CalendarioLocal = sequelize.define('CalendarioLocal', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tipo_id: { type: DataTypes.INTEGER, allowNull: false },
    nombre: { type: DataTypes.STRING(160), allowNull: false },
    visibilidad_id: { type: DataTypes.INTEGER, allowNull: false },
    feder_id: { type: DataTypes.INTEGER },
    cliente_id: { type: DataTypes.INTEGER },
    time_zone: { type: DataTypes.STRING(60) },
    color: { type: DataTypes.STRING(30) },
    is_activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'CalendarioLocal', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
    indexes: [{ fields: ['tipo_id'] }, { fields: ['feder_id'] }, { fields: ['cliente_id'] }]
  });
  return CalendarioLocal;
};
