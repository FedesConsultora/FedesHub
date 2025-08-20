// backend/src/models/calendario/CalendarioVinculo.js
export default (sequelize, DataTypes) => {
  const CalendarioVinculo = sequelize.define('CalendarioVinculo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    calendario_local_id: { type: DataTypes.INTEGER, allowNull: false },
    google_cal_id: { type: DataTypes.INTEGER, allowNull: false },
    direccion_id: { type: DataTypes.INTEGER, allowNull: false },
    sync_token: { type: DataTypes.TEXT },
    last_synced_at: { type: DataTypes.DATE },
    is_activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'CalendarioVinculo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
       indexes: [{ unique: true, fields: ['calendario_local_id','google_cal_id'] }] });
  return CalendarioVinculo;
};
