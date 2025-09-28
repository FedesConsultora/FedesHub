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
// backend/src/models/celulas/CelulaEstado.js
export default (sequelize, DataTypes) => {
  const CelulaEstado = sequelize.define('CelulaEstado', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'CelulaEstado', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return CelulaEstado;
};
// backend/src/models/celulas/CelulaRolAsignacion.js
export default (sequelize, DataTypes) => {
  const CelulaRolAsignacion = sequelize.define('CelulaRolAsignacion', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    celula_id: { type: DataTypes.INTEGER, allowNull: false },
    feder_id: { type: DataTypes.INTEGER, allowNull: false },
    rol_tipo_id: { type: DataTypes.INTEGER, allowNull: false },
    desde: { type: DataTypes.DATEONLY, allowNull: false },
    hasta: { type: DataTypes.DATEONLY },
    es_principal: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    observacion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'CelulaRolAsignacion', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
       indexes: [{ fields: ['celula_id','rol_tipo_id','desde'] }, { fields: ['feder_id','celula_id'] }] });
  return CelulaRolAsignacion;
};
// backend/src/models/celulas/CelulaRolTipo.js
export default (sequelize, DataTypes) => {
  const CelulaRolTipo = sequelize.define('CelulaRolTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(120), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'CelulaRolTipo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return CelulaRolTipo;
};
