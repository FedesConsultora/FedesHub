// backend/src/models/chat/ChatTyping.js

export default (sequelize, DataTypes) => {
  const ChatTyping = sequelize.define('ChatTyping', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    canal_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    started_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    expires_at: { type: DataTypes.DATE, allowNull: false }
  }, {
    tableName: 'ChatTyping',
    underscored: true,
    timestamps: false
  });
  return ChatTyping;
};
