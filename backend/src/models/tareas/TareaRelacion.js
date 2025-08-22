// /backend/src/models/tareas/TareaRelacion.js
export default (sequelize, DataTypes) => {
  const TareaRelacion = sequelize.define('TareaRelacion', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tarea_id: { type: DataTypes.INTEGER, allowNull: false },
    relacionada_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo_id: { type: DataTypes.INTEGER, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, { tableName: 'TareaRelacion', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false,
       indexes: [{ unique: true, fields: ['tarea_id','relacionada_id','tipo_id'] }] });
  return TareaRelacion;
};
