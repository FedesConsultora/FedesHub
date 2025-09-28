// backend/src/models/tareas/TareaKanbanPos.js
export default (sequelize, DataTypes) => {
  const TareaKanbanPos = sequelize.define('TareaKanbanPos', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tarea_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id:  { type: DataTypes.INTEGER, allowNull: false },
    stage_code:{ type: DataTypes.STRING(20), allowNull: false },
    pos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'TareaKanbanPos', underscored: true, timestamps: false,
       indexes: [{ fields: ['user_id','stage_code','pos'] }, { unique:true, fields: ['user_id','tarea_id'] }] });
  return TareaKanbanPos;
};
