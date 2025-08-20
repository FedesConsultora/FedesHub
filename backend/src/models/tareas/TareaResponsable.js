// backend/src/models/tareas/TareaResponsable.js
export default (sequelize, DataTypes) => {
  const TareaResponsable = sequelize.define('TareaResponsable', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tarea_id: { type: DataTypes.INTEGER, allowNull: false },
    feder_id: { type: DataTypes.INTEGER, allowNull: false },
    es_lider: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    asignado_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'TareaResponsable', underscored: true, timestamps: false,
       indexes: [{ unique: true, fields: ['tarea_id','feder_id'] }] });
  return TareaResponsable;
};