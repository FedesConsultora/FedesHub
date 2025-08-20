// backend/src/models/calendario/Evento.js
export default (sequelize, DataTypes) => {
  const Evento = sequelize.define('Evento', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    calendario_local_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo_id: { type: DataTypes.INTEGER, allowNull: false },
    titulo: { type: DataTypes.STRING(200), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    lugar: { type: DataTypes.STRING(255) },
    all_day: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    starts_at: { type: DataTypes.DATE, allowNull: false },
    ends_at: { type: DataTypes.DATE, allowNull: false },
    rrule: { type: DataTypes.STRING(255) },
    visibilidad_id: { type: DataTypes.INTEGER, allowNull: false },
    color: { type: DataTypes.STRING(30) },
    asistencia_registro_id: { type: DataTypes.INTEGER },
    ausencia_id: { type: DataTypes.INTEGER },
    tarea_id: { type: DataTypes.INTEGER },
    created_by_user_id: { type: DataTypes.INTEGER },
    updated_by_user_id: { type: DataTypes.INTEGER },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'Evento', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
       indexes: [{ fields: ['calendario_local_id','starts_at'] }, { fields: ['tipo_id'] }, { fields: ['asistencia_registro_id'] }, { fields: ['ausencia_id'] }, { fields: ['tarea_id'] }] });
  return Evento;
};
