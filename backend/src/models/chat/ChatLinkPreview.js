// backend/src/models/chat/ChatLinkPreview.js

export default (sequelize, DataTypes) => {
  const ChatLinkPreview = sequelize.define('ChatLinkPreview', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    mensaje_id: { type: DataTypes.INTEGER, allowNull: false },
    url: { type: DataTypes.TEXT, allowNull: false },
    title: { type: DataTypes.STRING(255) },
    description: { type: DataTypes.TEXT },
    image_url: { type: DataTypes.TEXT },
    site_name: { type: DataTypes.STRING(120) },
    resolved_at: { type: DataTypes.DATE }
  }, {
    tableName: 'ChatLinkPreview',
    underscored: true,
    timestamps: false
  });
  return ChatLinkPreview;
};
