// backend/src/models/chat/ChatThreadFollow.js

export default (sequelize, DataTypes) => {
  const ChatThreadFollow = sequelize.define('ChatThreadFollow', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    root_msg_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    followed_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'ChatThreadFollow',
    underscored: true,
    timestamps: false
  });
  return ChatThreadFollow;
};
