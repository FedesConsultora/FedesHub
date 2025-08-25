// backend/src/models/chat/ChatCanalMiembro.js
export default (sequelize, DataTypes) => {
  const ChatCanalMiembro = sequelize.define('ChatCanalMiembro', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    canal_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    feder_id: { type: DataTypes.INTEGER },
    rol_id: { type: DataTypes.INTEGER, allowNull: false },
    is_mute: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    notif_level: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'all' },
    last_read_msg_id: { type: DataTypes.INTEGER },
    last_read_at: { type: DataTypes.DATE },
    joined_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    left_at: { type: DataTypes.DATE }
  }, {
    tableName: 'ChatCanalMiembro',
    underscored: true,
    timestamps: false
  });
  return ChatCanalMiembro;
};
