// backend/src/models/tareas/TareaComentario.js
export default (sequelize, DataTypes) => {
  const TareaComentario = sequelize.define('TareaComentario', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tarea_id: { type: DataTypes.INTEGER, allowNull: false },
    feder_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo_id: { type: DataTypes.INTEGER, allowNull: false },
    contenido: { type: DataTypes.TEXT, allowNull: false },
    reply_to_id: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'TareaComentario', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
       indexes: [{ fields: ['tarea_id','created_at'] }] });
  return TareaComentario;
};
