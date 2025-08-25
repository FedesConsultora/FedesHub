// backend/src/models/chat/ChatMensajeEditHist.js

export default (sequelize, DataTypes) => {
  const ChatMensajeEditHist = sequelize.define('ChatMensajeEditHist', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    mensaje_id: { type: DataTypes.INTEGER, allowNull: false },
    version_num: { type: DataTypes.INTEGER, allowNull: false },
    body_text: { type: DataTypes.TEXT },
    body_json: { type: DataTypes.JSONB },
    edited_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    edited_by_user_id: { type: DataTypes.INTEGER }
  }, {
    tableName: 'ChatMensajeEditHist',
    underscored: true,
    timestamps: false
  });
  return ChatMensajeEditHist;
};
