// backend/src/models/calendario/EventoSync.js
export default (sequelize, DataTypes) => {
  const EventoSync = sequelize.define('EventoSync', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    evento_id: { type: DataTypes.INTEGER, allowNull: false },
    google_cal_id: { type: DataTypes.INTEGER, allowNull: false },
    google_event_id: { type: DataTypes.STRING(256), allowNull: false },
    etag: { type: DataTypes.STRING(128) },
    last_synced_at: { type: DataTypes.DATE },
    last_error: { type: DataTypes.TEXT },
    is_deleted_remote: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    is_deleted_local: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    ical_uid: { type: DataTypes.STRING(256) },
    recurring_event_id: { type: DataTypes.STRING(256) },
    original_start_time: { type: DataTypes.DATE }
  }, {
    tableName: 'EventoSync',
    underscored: true,
    timestamps: false,
    indexes: [
      { unique: true, fields: ['evento_id', 'google_cal_id'] },
      { fields: ['google_event_id'] },
      { unique: true, fields: ['google_cal_id', 'google_event_id'] } // NUEVO
    ]
  });
  return EventoSync;
};
