// backend/src/models/feders/DiaSemana.js
export default (sequelize, DataTypes) => {
  const DiaSemana = sequelize.define('DiaSemana', {
    id: { type: DataTypes.SMALLINT, primaryKey: true },
    codigo: { type: DataTypes.STRING(10), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(20), allowNull: false }
  }, { tableName: 'DiaSemana', underscored: true, timestamps: false });
  return DiaSemana;
};
// backend/src/models/feders/Feder.js
export default (sequelize, DataTypes) => {
  const Feder = sequelize.define('Feder', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER },
    celula_id: { type: DataTypes.INTEGER },
    estado_id: { type: DataTypes.INTEGER, allowNull: false },
    nombre: { type: DataTypes.STRING(120), allowNull: false },
    apellido: { type: DataTypes.STRING(120), allowNull: false },
    telefono: { type: DataTypes.STRING(30) },
    avatar_url: { type: DataTypes.STRING(512) },
    fecha_ingreso: { type: DataTypes.DATEONLY },
    fecha_egreso: { type: DataTypes.DATEONLY },
    is_activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'Feder', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return Feder;
};
// backend/src/models/feders/FederEstadoTipo.js
export default (sequelize, DataTypes) => {
  const FederEstadoTipo = sequelize.define('FederEstadoTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'FederEstadoTipo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return FederEstadoTipo;
};
// backend/src/models/feders/FederModalidadDia.js
export default (sequelize, DataTypes) => {
  const FederModalidadDia = sequelize.define('FederModalidadDia', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    feder_id: { type: DataTypes.INTEGER, allowNull: false },
    dia_semana_id: { type: DataTypes.SMALLINT, allowNull: false },
    modalidad_id: { type: DataTypes.INTEGER, allowNull: false },
    comentario: { type: DataTypes.TEXT },
    is_activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'FederModalidadDia', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
       indexes: [{ unique: true, fields: ['feder_id','dia_semana_id'] }] });
  return FederModalidadDia;
};
// backend/src/models/feders/ModalidadTrabajoTipo.js
export default (sequelize, DataTypes) => {
  const ModalidadTrabajoTipo = sequelize.define('ModalidadTrabajoTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'ModalidadTrabajoTipo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return ModalidadTrabajoTipo;
};
