// backend/src/models/tareas/TareaFavorito.js

export default (sequelize, DataTypes) => {
  const TareaFavorito = sequelize.define('TareaFavorito', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tarea_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'TareaFavorito', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false,
       indexes: [{ unique: true, fields: ['tarea_id','user_id'] }] });
  return TareaFavorito;
};
