// backend/src/models/feders/FirmaPerfil.js
export default (sequelize, DataTypes) => {
  const FirmaPerfil = sequelize.define('FirmaPerfil', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    feder_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },

    // Datos para “firma tipográfica” (Odoo-like)
    firma_textual: { type: DataTypes.STRING(220) },     // ej: "Enzo Pinotti"
    dni_tipo: { type: DataTypes.STRING(20) },
    dni_numero_enc: { type: DataTypes.TEXT },           // JSON AES-GCM

    // Firma por iniciales (auto-generable) y assets
    firma_iniciales_svg: { type: DataTypes.TEXT },      // SVG inline
    firma_iniciales_png_url: { type: DataTypes.STRING(512) },

    // PIN de firma (opcional) — almacenar hash argon2id
    pin_hash: { type: DataTypes.STRING(255) },

    is_activa: { type: DataTypes.BOOLEAN, defaultValue: true },

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'FirmaPerfil',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return FirmaPerfil;
};
