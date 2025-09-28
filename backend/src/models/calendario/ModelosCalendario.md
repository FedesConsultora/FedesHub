// backend/src/models/calendario/AsistenteTipo.js
export default (sequelize, DataTypes) => {
  const AsistenteTipo = sequelize.define('AsistenteTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(60), allowNull: false },
    descripcion: { type: DataTypes.TEXT }
  }, { tableName: 'AsistenteTipo', underscored: true, timestamps: false });
  return AsistenteTipo;
};
// backend/src/models/calendario/CalendarioLocal.js
export default (sequelize, DataTypes) => {
  const CalendarioLocal = sequelize.define('CalendarioLocal', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tipo_id: { type: DataTypes.INTEGER, allowNull: false },
    nombre: { type: DataTypes.STRING(160), allowNull: false },
    visibilidad_id: { type: DataTypes.INTEGER, allowNull: false },
    feder_id: { type: DataTypes.INTEGER },
    celula_id: { type: DataTypes.INTEGER },
    cliente_id: { type: DataTypes.INTEGER },
    time_zone: { type: DataTypes.STRING(60) },
    color: { type: DataTypes.STRING(30) },
    is_activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'CalendarioLocal', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
       indexes: [{ fields: ['tipo_id'] },{ fields: ['feder_id'] },{ fields: ['celula_id'] },{ fields: ['cliente_id'] }] });
  return CalendarioLocal;
};
// backend/src/models/calendario/CalendarioTipo.js
export default (sequelize, DataTypes) => {
  const CalendarioTipo = sequelize.define('CalendarioTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'CalendarioTipo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return CalendarioTipo;
};
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
// backend/src/models/calendario/Evento.js
export default (sequelize, DataTypes) => {
  const Evento = sequelize.define('Evento', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    calendario_local_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo_id: { type: DataTypes.INTEGER, allowNull: false },
    titulo: { type: DataTypes.STRING(200), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    lugar: { type: DataTypes.STRING(255) },
    all_day: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    starts_at: { type: DataTypes.DATE, allowNull: false },
    ends_at: { type: DataTypes.DATE, allowNull: false },
    rrule: { type: DataTypes.STRING(255) },
    visibilidad_id: { type: DataTypes.INTEGER, allowNull: false },
    color: { type: DataTypes.STRING(30) },
    asistencia_registro_id: { type: DataTypes.INTEGER },
    ausencia_id: { type: DataTypes.INTEGER },
    tarea_id: { type: DataTypes.INTEGER },
    created_by_user_id: { type: DataTypes.INTEGER },
    updated_by_user_id: { type: DataTypes.INTEGER },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'Evento', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
       indexes: [{ fields: ['calendario_local_id','starts_at'] }, { fields: ['tipo_id'] }, { fields: ['asistencia_registro_id'] }, { fields: ['ausencia_id'] }, { fields: ['tarea_id'] }] });
  return Evento;
};
// backend/src/models/calendario/EventoAsistente.js
export default (sequelize, DataTypes) => {
  const EventoAsistente = sequelize.define('EventoAsistente', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    evento_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo_id: { type: DataTypes.INTEGER, allowNull: false },
    feder_id: { type: DataTypes.INTEGER },
    email_externo: { type: DataTypes.STRING(255) },
    nombre: { type: DataTypes.STRING(160) },
    respuesta: { type: DataTypes.STRING(30) },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'EventoAsistente', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false,
       indexes: [{ fields: ['evento_id'] }, { fields: ['feder_id'] }, { fields: ['email_externo'] }] });
  return EventoAsistente;
};
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
// backend/src/models/calendario/EventoTipo.js
export default (sequelize, DataTypes) => {
  const EventoTipo = sequelize.define('EventoTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(120), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'EventoTipo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return EventoTipo;
};
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
  }, {
    tableName: 'GoogleCalendario',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['cuenta_id'] },
      { fields: ['google_calendar_id'] },
      { unique: true, fields: ['cuenta_id', 'google_calendar_id'] } 
    ]
  });
  return GoogleCalendario;
};
// backend/src/models/calendario/GoogleCuenta.js
export default (sequelize, DataTypes) => {
  const GoogleCuenta = sequelize.define('GoogleCuenta', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    google_user_id: { type: DataTypes.STRING(128), allowNull: false, unique: true },
    email: { type: DataTypes.STRING(255), allowNull: false },
    refresh_token_enc: { type: DataTypes.TEXT },
    token_scope: { type: DataTypes.TEXT },
    connected_at: { type: DataTypes.DATE },
    revoked_at: { type: DataTypes.DATE },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'GoogleCuenta', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return GoogleCuenta;
};
// backend/src/models/calendario/GoogleWebhookCanal.js
export default (sequelize, DataTypes) => {
  const GoogleWebhookCanal = sequelize.define('GoogleWebhookCanal', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cuenta_id: { type: DataTypes.INTEGER, allowNull: false },
    google_cal_id: { type: DataTypes.INTEGER, allowNull: false }, 
    channel_id: { type: DataTypes.STRING(200), allowNull: false, unique: true },
    resource_id: { type: DataTypes.STRING(200), allowNull: false },
    resource_uri: { type: DataTypes.TEXT },
    expiration_at: { type: DataTypes.DATE, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    is_activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
  }, {
    tableName: 'GoogleWebhookCanal',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      { fields: ['cuenta_id'] },
      { fields: ['resource_id'] },
      { fields: ['google_cal_id', 'is_activo'] } // NUEVO
    ]
  });
  return GoogleWebhookCanal;
};
// backend/src/models/calendario/SyncDireccionTipo.js
export default (sequelize, DataTypes) => {
  const SyncDireccionTipo = sequelize.define('SyncDireccionTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(60), allowNull: false },
    descripcion: { type: DataTypes.TEXT }
  }, { tableName: 'SyncDireccionTipo', underscored: true, timestamps: false });
  return SyncDireccionTipo;
};
// backend/src/models/calendario/VisibilidadTipo.js
export default (sequelize, DataTypes) => {
  const VisibilidadTipo = sequelize.define('VisibilidadTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'VisibilidadTipo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return VisibilidadTipo;
};
