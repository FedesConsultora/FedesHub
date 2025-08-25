
// backend/src/models/chat/ChatPresence.js

export default (sequelize, DataTypes) => {
  const ChatPresence = sequelize.define('ChatPresence', {
    user_id: { type: DataTypes.INTEGER, primaryKey: true },
    status: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'offline' },
    device: { type: DataTypes.STRING(60) },
    last_seen_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'ChatPresence',
    underscored: true,
    timestamps: false
  });
  return ChatPresence;
};
