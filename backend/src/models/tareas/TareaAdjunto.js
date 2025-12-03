// backend/src/models/tareas/TareaAdjunto.js

export default (sequelize, DataTypes) => {
  const TareaAdjunto = sequelize.define('TareaAdjunto', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tarea_id: { type: DataTypes.INTEGER, allowNull: false },
    comentario_id: { type: DataTypes.INTEGER },
    nombre: { type: DataTypes.STRING(255) },
    mime: { type: DataTypes.STRING(120) },
    tamano_bytes: { type: DataTypes.BIGINT },
    drive_file_id: { type: DataTypes.STRING(255) },
    drive_url: { type: DataTypes.STRING(512) },
    subido_por_feder_id: { type: DataTypes.INTEGER },
    es_embebido: { type: DataTypes.BOOLEAN, defaultValue: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'TareaAdjunto', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false,
    indexes: [{ fields: ['tarea_id'] }]
  });
  return TareaAdjunto;
};
