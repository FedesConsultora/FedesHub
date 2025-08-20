// backend/src/models/notificaciones/NotificacionEnvio.js
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
    queued_at: { type: DataTypes.DATE },
    enviado_at: { type: DataTypes.DATE },
    entregado_at: { type: DataTypes.DATE },
    abierto_at: { type: DataTypes.DATE },
    leido_at: { type: DataTypes.DATE }
  }, { tableName: 'NotificacionEnvio', underscored: true, timestamps: false,
       indexes: [{ unique: true, fields: ['destino_id','canal_id'] }, { fields: ['estado_id'] }, { fields: ['provider_msg_id'] }, { fields: ['tracking_token'] }] 
    });
  return NotificacionEnvio;
};