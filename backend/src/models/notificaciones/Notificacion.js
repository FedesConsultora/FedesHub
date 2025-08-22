// Notificacion.js
export default (sequelize, DataTypes) => {
  const Notificacion = sequelize.define('Notificacion', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tipo_id: { type: DataTypes.INTEGER, allowNull: false },
    importancia_id: { type: DataTypes.INTEGER, allowNull: false },
    titulo: { type: DataTypes.STRING(200) },
    mensaje: { type: DataTypes.TEXT },
    data_json: { type: DataTypes.TEXT },
    link_url: { type: DataTypes.STRING(512) },

    // Threading / deep-link
    hilo_key: { type: DataTypes.STRING(120) },             // << (ej: TAREA-123, CHAT-456, EVENTO-789)
    tarea_id: { type: DataTypes.INTEGER },
    ausencia_id: { type: DataTypes.INTEGER },
    asistencia_registro_id: { type: DataTypes.INTEGER },
    evento_id: { type: DataTypes.INTEGER },                // <<  (calendario/reuniones)
    chat_canal_id: { type: DataTypes.INTEGER },            // <<  (notis del chat)

    created_by_user_id: { type: DataTypes.INTEGER },
    programada_at: { type: DataTypes.DATE },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'Notificacion', underscored: true, timestamps: false,
       indexes: [
         { fields: ['tipo_id'] },
         { fields: ['tarea_id'] },
         { fields: ['ausencia_id'] },
         { fields: ['asistencia_registro_id'] },
         { fields: ['evento_id'] },                       
         { fields: ['chat_canal_id'] },                  
         { fields: ['hilo_key'] }                         
       ] });
  return Notificacion;
};
