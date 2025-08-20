// backend/src/models/tareas/TareaColaborador.js
export default (sequelize, DataTypes) => {
  const TareaColaborador = sequelize.define('TareaColaborador', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tarea_id: { type: DataTypes.INTEGER, allowNull: false },
    feder_id: { type: DataTypes.INTEGER, allowNull: false },
    rol: { type: DataTypes.STRING(100) },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'TareaColaborador', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false,
       indexes: [{ unique: true, fields: ['tarea_id','feder_id'] }] });
  return TareaColaborador;
};
