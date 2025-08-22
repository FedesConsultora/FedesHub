//backend/src/models/tareas/TareaComentarioMencion.js

export default (sequelize, DataTypes) => {
  const TareaComentarioMencion = sequelize.define('TareaComentarioMencion', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    comentario_id: { type: DataTypes.INTEGER, allowNull: false },
    feder_id: { type: DataTypes.INTEGER, allowNull: false },
  }, { tableName: 'TareaComentarioMencion', underscored: true, timestamps: false,
       indexes: [{ unique: true, fields: ['comentario_id','feder_id'] }] });
  return TareaComentarioMencion;
};
