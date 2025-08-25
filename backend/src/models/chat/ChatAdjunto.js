// backend/src/models/chat/ChatAdjunto.js

export default (sequelize, DataTypes) => {
  const ChatAdjunto = sequelize.define('ChatAdjunto', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    mensaje_id: { type: DataTypes.INTEGER, allowNull: false },
    file_url: { type: DataTypes.TEXT, allowNull: false },
    file_name: { type: DataTypes.STRING(255) },
    mime_type: { type: DataTypes.STRING(160) },
    size_bytes: { type: DataTypes.BIGINT },
    width: { type: DataTypes.INTEGER },
    height: { type: DataTypes.INTEGER },
    duration_sec: { type: DataTypes.INTEGER },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'ChatAdjunto',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false
  });
  return ChatAdjunto;
};
