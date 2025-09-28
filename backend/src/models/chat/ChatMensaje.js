// backend/src/models/chat/ChatMensaje.js

export default (sequelize, DataTypes) => {
  const ChatMensaje = sequelize.define('ChatMensaje', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    canal_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    feder_id: { type: DataTypes.INTEGER },
    parent_id: { type: DataTypes.INTEGER },
    client_msg_id: { type: DataTypes.STRING(64) },
    body_text: { type: DataTypes.TEXT },
    body_json: { type: DataTypes.JSONB },
    is_edited: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    edited_at: { type: DataTypes.DATE },
    deleted_at: { type: DataTypes.DATE },
    deleted_by_user_id: { type: DataTypes.INTEGER },
    reply_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    last_reply_at: { type: DataTypes.DATE },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'ChatMensaje',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: false,
    indexes: [
      { name: 'IX_ChatMensaje_canal_created', fields: ['canal_id', 'created_at'] },
      { name: 'IX_ChatMensaje_parent_created', fields: ['parent_id', 'created_at'] },
      { name: 'IX_ChatMensaje_user_created', fields: ['user_id', 'created_at'] },
      { name: 'IX_ChatMensaje_canal_id', fields: ['canal_id', 'id'] },
      { name: 'IX_ChatMensaje_parent_id', fields: ['parent_id', 'id'] }
    ]
  });
  return ChatMensaje;
};
