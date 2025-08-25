// backend/src/models/chat/ChatSavedMessage.js

export default (sequelize, DataTypes) => {
  const ChatSavedMessage = sequelize.define('ChatSavedMessage', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    mensaje_id: { type: DataTypes.INTEGER, allowNull: false },
    saved_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'ChatSavedMessage',
    underscored: true,
    timestamps: false
  });
  return ChatSavedMessage;
};
