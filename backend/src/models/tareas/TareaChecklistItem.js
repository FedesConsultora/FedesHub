// /backend/src/models/tareas/TareaChecklistItem.js
export default (sequelize, DataTypes) => {
  const TareaChecklistItem = sequelize.define('TareaChecklistItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tarea_id: { type: DataTypes.INTEGER, allowNull: false },
    titulo: { type: DataTypes.STRING(200), allowNull: false },
    is_done: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'TareaChecklistItem', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
       indexes: [{ fields: ['tarea_id','orden'] }] });
  return TareaChecklistItem;
};
