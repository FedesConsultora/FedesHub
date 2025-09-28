// BuzonTipo.js
export default (sequelize, DataTypes) => {
  const BuzonTipo = sequelize.define('BuzonTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(60), allowNull: false },
    descripcion: { type: DataTypes.TEXT }
  }, { tableName: 'BuzonTipo', underscored: true, timestamps: false });
  return BuzonTipo;
};
// backend/src/models/notificaciones/CanalTipo.js

export default (sequelize, DataTypes) => {
  const CanalTipo = sequelize.define('CanalTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(60), allowNull: false },
    descripcion: { type: DataTypes.TEXT }
  }, { tableName: 'CanalTipo', underscored: true, timestamps: false });
  return CanalTipo;
};

// backend/src/models/notificaciones/EstadoEnvio.js

export default (sequelize, DataTypes) => {
  const EstadoEnvio = sequelize.define('EstadoEnvio', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(60), allowNull: false },
    descripcion: { type: DataTypes.TEXT }
  }, { tableName: 'EstadoEnvio', underscored: true, timestamps: false });
  return EstadoEnvio;
};
// backend/src/models/notificaciones/ImportanciaTipo.js

export default (sequelize, DataTypes) => {
  const ImportanciaTipo = sequelize.define('ImportanciaTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(60), allowNull: false },
    orden: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 2 }
  }, { tableName: 'ImportanciaTipo', underscored: true, timestamps: false });
  return ImportanciaTipo;
};
// backend/src/models/notificaciones/Notificacion.js
export default (sequelize, DataTypes) => {
  const Notificacion = sequelize.define('Notificacion', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tipo_id: { type: DataTypes.INTEGER, allowNull: false },
    importancia_id: { type: DataTypes.INTEGER, allowNull: false },
    buzon_id: { type: DataTypes.INTEGER, allowNull: false },
    titulo: { type: DataTypes.STRING(200) },
    mensaje: { type: DataTypes.TEXT },
    data_json: { type: DataTypes.TEXT },
    link_url: { type: DataTypes.STRING(512) },
    hilo_key: { type: DataTypes.STRING(120) },
    tarea_id: { type: DataTypes.INTEGER },
    ausencia_id: { type: DataTypes.INTEGER },
    asistencia_registro_id: { type: DataTypes.INTEGER },
    evento_id: { type: DataTypes.INTEGER },
    chat_canal_id: { type: DataTypes.INTEGER },
    created_by_user_id: { type: DataTypes.INTEGER },
    programada_at: { type: DataTypes.DATE },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'Notificacion', underscored: true, timestamps: false,
       indexes: [
         { fields: ['tipo_id'] },
         { fields: ['buzon_id'] },
         { fields: ['tarea_id'] },
         { fields: ['ausencia_id'] },
         { fields: ['asistencia_registro_id'] },
         { fields: ['evento_id'] },
         { fields: ['chat_canal_id'] },
         { fields: ['hilo_key'] }
       ] });
  return Notificacion;
};

// backend/src/models/notificaciones/NotificacionDestino.js

export default (sequelize, DataTypes) => {
  const NotificacionDestino = sequelize.define('NotificacionDestino', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    notificacion_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    feder_id: { type: DataTypes.INTEGER },

    // Estado por usuario (para inbox por bandeja)
    in_app_seen_at: { type: DataTypes.DATE },             // << nuevo (vista previa en burbuja / panel)
    read_at: { type: DataTypes.DATE },                    // << nuevo (marcar como leído)
    dismissed_at: { type: DataTypes.DATE },               
    archived_at: { type: DataTypes.DATE },                
    pin_orden: { type: DataTypes.INTEGER },               

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'NotificacionDestino', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false,
       indexes: [
         { unique: true, fields: ['notificacion_id','user_id'] },
         { fields: ['user_id','archived_at'] },
         { fields: ['user_id','read_at'] },
         { fields: ['user_id','pin_orden'] }
       ] });
  return NotificacionDestino;
};
export default (sequelize, DataTypes) => {
  const NotificacionEnvio = sequelize.define('NotificacionEnvio', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    destino_id: { type: DataTypes.INTEGER, allowNull: false },
    canal_id: { type: DataTypes.INTEGER, allowNull: false },
    proveedor_id: { type: DataTypes.INTEGER },
    estado_id: { type: DataTypes.INTEGER, allowNull: false },
    asunto_render: { type: DataTypes.STRING(200) },
    cuerpo_render: { type: DataTypes.TEXT },
    data_render_json: { type: DataTypes.TEXT },
    provider_msg_id: { type: DataTypes.STRING(255) },
    tracking_token: { type: DataTypes.STRING(64) },
    intento_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    ultimo_error: { type: DataTypes.TEXT },
    queued_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    enviado_at: { type: DataTypes.DATE },
    entregado_at: { type: DataTypes.DATE },
    abierto_at: { type: DataTypes.DATE },
    leido_at: { type: DataTypes.DATE }
  }, {
    tableName: 'NotificacionEnvio',
    underscored: true,
    timestamps: false,
    indexes: [
      { fields: ['destino_id', 'canal_id', 'proveedor_id'] },
      { fields: ['estado_id'] },
      { fields: ['provider_msg_id'] },
      { unique: true, fields: ['tracking_token'] }
    ]
  });
  return NotificacionEnvio;
};
// backend/src/models/notificaciones/NotificacionPlantilla.js
export default (sequelize, DataTypes) => {
  const NotificacionPlantilla = sequelize.define('NotificacionPlantilla', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tipo_id: { type: DataTypes.INTEGER, allowNull: false },
    canal_id: { type: DataTypes.INTEGER, allowNull: false },
    idioma: { type: DataTypes.STRING(10), allowNull: false },
    asunto_tpl: { type: DataTypes.STRING(200) },
    cuerpo_tpl: { type: DataTypes.TEXT },
    data_schema_json: { type: DataTypes.TEXT },
    is_activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'NotificacionPlantilla', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
       indexes: [{ unique: true, fields: ['tipo_id','canal_id','idioma'] }] });
  return NotificacionPlantilla;
};
// backend/src/models/notificaciones/NotificacionPreferencia.js
export default (sequelize, DataTypes) => {
  const NotificacionPreferencia = sequelize.define('NotificacionPreferencia', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo_id: { type: DataTypes.INTEGER, allowNull: false },
    canal_id: { type: DataTypes.INTEGER, allowNull: false },
    is_habilitado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'NotificacionPreferencia', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
       indexes: [{ unique: true, fields: ['user_id','tipo_id','canal_id'] }] });
  return NotificacionPreferencia;
};
// NotificacionTipo.js
export default (sequelize, DataTypes) => {
  const NotificacionTipo = sequelize.define('NotificacionTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(60), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(120), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    buzon_id: { type: DataTypes.INTEGER, allowNull: false }, 
    canales_default_json: { type: DataTypes.JSONB }, 
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'NotificacionTipo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return NotificacionTipo;
};
// backend/src/models/notificaciones/ProveedorTipo.js
export default (sequelize, DataTypes) => {
  const ProveedorTipo = sequelize.define('ProveedorTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(60), allowNull: false },
    descripcion: { type: DataTypes.TEXT }
  }, { tableName: 'ProveedorTipo', underscored: true, timestamps: false });
  return ProveedorTipo;
};
// backend/src/models/notificaciones/PushToken.js
export default (sequelize, DataTypes) => {
  const PushToken = sequelize.define('PushToken', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    proveedor_id: { type: DataTypes.INTEGER, allowNull: false },
    token: { type: DataTypes.TEXT, allowNull: false, unique: true },
    plataforma: { type: DataTypes.STRING(30) },
    device_info: { type: DataTypes.STRING(255) },
    last_seen_at: { type: DataTypes.DATE },
    is_revocado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'PushToken', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return PushToken;
};