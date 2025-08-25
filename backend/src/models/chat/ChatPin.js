// backend/src/models/chat/ChatPin.js

export default (sequelize, DataTypes) => {
  const ChatPin = sequelize.define('ChatPin', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    canal_id: { type: DataTypes.INTEGER, allowNull: false },
    mensaje_id: { type: DataTypes.INTEGER, allowNull: false },
    pinned_by_user_id: { type: DataTypes.INTEGER },
    pin_orden: { type: DataTypes.INTEGER },
    pinned_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'ChatPin',
    underscored: true,
    timestamps: false
  });
  return ChatPin;
};
