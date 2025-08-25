// backend/src/models/chat/ChatCanalTipo.js
export default (sequelize, DataTypes) => {
  const ChatCanalTipo = sequelize.define('ChatCanalTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(60), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'ChatCanalTipo',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return ChatCanalTipo;
};
