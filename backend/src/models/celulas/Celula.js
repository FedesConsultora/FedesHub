// backend/src/models/celulas/Celula.js
// Celula.js — Modelo con perfil e imágenes
export default (sequelize, DataTypes) => {
  const Celula = sequelize.define('Celula', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    slug: { type: DataTypes.STRING(140), allowNull: false, unique: true },            // NUEVO
    descripcion: { type: DataTypes.TEXT },
    perfil_md: { type: DataTypes.TEXT },                                              // NUEVO (markdown)
    avatar_url: { type: DataTypes.STRING(512) },                                      // NUEVO
    cover_url:  { type: DataTypes.STRING(512) },                                      // NUEVO
    estado_id: { type: DataTypes.INTEGER, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'Celula',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ fields: ['estado_id'] }, { unique: true, fields: ['slug'] }]
  });
  return Celula;
};
