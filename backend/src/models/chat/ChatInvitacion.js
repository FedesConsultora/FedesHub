// backend/src/models/chat/ChatInvitacion.js

export default (sequelize, DataTypes) => {
  const ChatInvitacion = sequelize.define('ChatInvitacion', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    canal_id: { type: DataTypes.INTEGER, allowNull: false },
    invited_user_id: { type: DataTypes.INTEGER },
    invited_email: { type: DataTypes.STRING(255) },
    invited_by_user_id: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
    token: { type: DataTypes.STRING(64), unique: true },
    expires_at: { type: DataTypes.DATE },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    responded_at: { type: DataTypes.DATE }
  }, {
    tableName: 'ChatInvitacion',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      { name: 'IX_ChatInvitacion_canal', fields: ['canal_id'] },
      { name: 'IX_ChatInvitacion_user', fields: ['invited_user_id'] },
      { name: 'IX_ChatInvitacion_email', fields: ['invited_email'] }
    ]
  });
  return ChatInvitacion;
};
