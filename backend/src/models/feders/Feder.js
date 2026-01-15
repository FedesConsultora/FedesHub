// backend/src/models/feders/Feder.js
export default (sequelize, DataTypes) => {
  const Feder = sequelize.define('Feder', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER },
    estado_id: { type: DataTypes.INTEGER, allowNull: false },
    nombre: { type: DataTypes.STRING(120), allowNull: false },
    apellido: { type: DataTypes.STRING(120), allowNull: false },
    telefono: { type: DataTypes.STRING(30) },
    avatar_url: { type: DataTypes.STRING(512) },
    fecha_ingreso: { type: DataTypes.DATEONLY },
    fecha_egreso: { type: DataTypes.DATEONLY },
    is_activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    is_clevel: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

    // 👇 NUEVO — datos de identidad/ERP (encriptados donde corresponde)
    nombre_legal: { type: DataTypes.STRING(180) },
    dni_tipo: { type: DataTypes.STRING(20) },  // 'DNI','PAS','CI', etc.
    dni_numero_enc: { type: DataTypes.TEXT },        // JSON AES-GCM
    cuil_cuit_enc: { type: DataTypes.TEXT },        // JSON AES-GCM
    fecha_nacimiento: { type: DataTypes.DATEONLY },
    domicilio_json: { type: DataTypes.JSONB },       // { calle, nro, piso, cp, ciudad, provincia, pais }

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'Feder',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return Feder;
};
