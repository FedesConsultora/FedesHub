// backend/src/models/chat/ChatReadReceipt.js

export default (sequelize, DataTypes) => {
  const ChatReadReceipt = sequelize.define('ChatReadReceipt', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    mensaje_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    read_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'ChatReadReceipt',
    underscored: true,
    timestamps: false
  });
  return ChatReadReceipt;
};
