// backend/src/models/chat/ChatDelivery.js

export default (sequelize, DataTypes) => {
  const ChatDelivery = sequelize.define('ChatDelivery', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    mensaje_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    delivered_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'ChatDelivery',
    underscored: true,
    timestamps: false
  });
  return ChatDelivery;
};
