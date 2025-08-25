// backend/src/models/chat/ChatRolTipo.js

export default (sequelize, DataTypes) => {
  const ChatRolTipo = sequelize.define('ChatRolTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(60), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'ChatRolTipo',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return ChatRolTipo;
};
