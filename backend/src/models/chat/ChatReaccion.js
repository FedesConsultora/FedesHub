// backend/src/models/chat/ChatReaccion.js

export default (sequelize, DataTypes) => {
  const ChatReaccion = sequelize.define('ChatReaccion', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    mensaje_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    emoji: { type: DataTypes.STRING(80), allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'ChatReaccion',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false
  });
  return ChatReaccion;
};
