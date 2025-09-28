// backend/src/models/asistencia/AsistenciaCierreMotivoTipo.js
export default (sequelize, DataTypes) => {
  const AsistenciaCierreMotivoTipo = sequelize.define('AsistenciaCierreMotivoTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'AsistenciaCierreMotivoTipo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return AsistenciaCierreMotivoTipo;
};
// backend/src/models/asistencia/AsistenciaOrigenTipo.js
export default (sequelize, DataTypes) => {
  const AsistenciaOrigenTipo = sequelize.define('AsistenciaOrigenTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'AsistenciaOrigenTipo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return AsistenciaOrigenTipo;
};
// backend/src/models/asistencia/AsistenciaRegistro.js
export default (sequelize, DataTypes) => {
  const AsistenciaRegistro = sequelize.define('AsistenciaRegistro', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    feder_id: { type: DataTypes.INTEGER, allowNull: false },
    check_in_at: { type: DataTypes.DATE, allowNull: false },
    check_in_origen_id: { type: DataTypes.INTEGER },
    check_out_at: { type: DataTypes.DATE },
    check_out_origen_id: { type: DataTypes.INTEGER },
    cierre_motivo_id: { type: DataTypes.INTEGER },
    modalidad_id: { type: DataTypes.INTEGER }, 
    comentario: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'AsistenciaRegistro',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['feder_id', 'check_in_at'] },
      { fields: ['check_out_at'] },
      { fields: ['modalidad_id'] }
    ]
  });
  return AsistenciaRegistro;
};
