// backend/src/models/chat/ChatCanal.js

export default (sequelize, DataTypes) => {
  const ChatCanal = sequelize.define('ChatCanal', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tipo_id: { type: DataTypes.INTEGER, allowNull: false },
    nombre: { type: DataTypes.STRING(120) },
    slug: { type: DataTypes.STRING(120) },
    topic: { type: DataTypes.STRING(240) },
    descripcion: { type: DataTypes.TEXT },
    is_privado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    is_archivado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    only_mods_can_post: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    slowmode_seconds: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    celula_id: { type: DataTypes.INTEGER },
    cliente_id: { type: DataTypes.INTEGER },
    created_by_user_id: { type: DataTypes.INTEGER },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'ChatCanal',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return ChatCanal;
};
