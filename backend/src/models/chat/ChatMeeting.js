// backend/src/models/chat/ChatMeeting.js

export default (sequelize, DataTypes) => {
  const ChatMeeting = sequelize.define('ChatMeeting', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    canal_id: { type: DataTypes.INTEGER, allowNull: false },
    provider_codigo: { type: DataTypes.STRING(30), allowNull: false },
    external_meeting_id: { type: DataTypes.STRING(128) },
    join_url: { type: DataTypes.TEXT },
    created_by_user_id: { type: DataTypes.INTEGER },
    starts_at: { type: DataTypes.DATE },
    ends_at: { type: DataTypes.DATE },
    evento_id: { type: DataTypes.INTEGER },
    mensaje_id: { type: DataTypes.INTEGER },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'ChatMeeting',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false
  });
  return ChatMeeting;
};
