// backend/src/models/calendario/GoogleCalendario.js
export default (sequelize, DataTypes) => {
  const GoogleCalendario = sequelize.define('GoogleCalendario', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    google_calendar_id: { type: DataTypes.STRING(256), allowNull: false },
    cuenta_id: { type: DataTypes.INTEGER, allowNull: false },
    summary: { type: DataTypes.STRING(200) },
    time_zone: { type: DataTypes.STRING(60) },
    access_role: { type: DataTypes.STRING(60) },
    is_primary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    color_id: { type: DataTypes.STRING(20) },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'GoogleCalendario', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
       indexes: [{ fields: ['cuenta_id'] }, { fields: ['google_calendar_id'] }] });
  return GoogleCalendario;
};
