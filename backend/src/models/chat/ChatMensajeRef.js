// backend/src/models/chat/ChatMensajeRef.js

export default (sequelize, DataTypes) => {
  const ChatMensajeRef = sequelize.define('ChatMensajeRef', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    mensaje_id: { type: DataTypes.INTEGER, allowNull: false },
    tarea_id: { type: DataTypes.INTEGER },
    evento_id: { type: DataTypes.INTEGER },
    ausencia_id: { type: DataTypes.INTEGER },
    asistencia_registro_id: { type: DataTypes.INTEGER },
    cliente_id: { type: DataTypes.INTEGER },
    feder_id: { type: DataTypes.INTEGER }
  }, {
    tableName: 'ChatMensajeRef',
    underscored: true,
    timestamps: false
  });
  return ChatMensajeRef;
};


