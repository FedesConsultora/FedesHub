// backend/src/models/calendario/EventoAsistente.js
export default (sequelize, DataTypes) => {
  const EventoAsistente = sequelize.define('EventoAsistente', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    evento_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo_id: { type: DataTypes.INTEGER, allowNull: false },
    feder_id: { type: DataTypes.INTEGER },
    email_externo: { type: DataTypes.STRING(255) },
    nombre: { type: DataTypes.STRING(160) },
    respuesta: { type: DataTypes.STRING(30) },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'EventoAsistente', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false,
       indexes: [{ fields: ['evento_id'] }, { fields: ['feder_id'] }, { fields: ['email_externo'] }] });
  return EventoAsistente;
};
