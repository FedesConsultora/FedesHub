// ChatCanal.js  (placeholder para el futuro módulo de chat en tiempo real)
export default (sequelize, DataTypes) => {
  const ChatCanal = sequelize.define('ChatCanal', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tipo: { type: DataTypes.STRING(20), allowNull: false }, // p.ej.: 'dm' | 'team' | 'project'
    nombre: { type: DataTypes.STRING(120) },
    slug: { type: DataTypes.STRING(120), unique: true },
    is_archivado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    created_by_user_id: { type: DataTypes.INTEGER },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'ChatCanal', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
       indexes: [{ fields: ['tipo'] }] });
  return ChatCanal;
};
