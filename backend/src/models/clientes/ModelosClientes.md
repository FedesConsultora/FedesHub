// backend/src/models/clientes/Cliente.js
export default (sequelize, DataTypes) => {
  const Cliente = sequelize.define('Cliente', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    celula_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo_id: { type: DataTypes.INTEGER, allowNull: false },
    estado_id: { type: DataTypes.INTEGER, allowNull: false },
    nombre: { type: DataTypes.STRING(160), allowNull: false, unique: true },
    alias: { type: DataTypes.STRING(120) },
    email: { type: DataTypes.STRING(255) },
    telefono: { type: DataTypes.STRING(40) },
    sitio_web: { type: DataTypes.STRING(255) },
    descripcion: { type: DataTypes.TEXT },
    ponderacion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'Cliente', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
       indexes: [{ fields: ['celula_id'] },{ fields: ['tipo_id'] },{ fields: ['estado_id'] },{ fields: ['ponderacion'] }] });
  return Cliente;
};
// backend/src/models/clientes/ClienteContacto.js
export default (sequelize, DataTypes) => {
  const ClienteContacto = sequelize.define('ClienteContacto', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cliente_id: { type: DataTypes.INTEGER, allowNull: false },
    nombre: { type: DataTypes.STRING(160), allowNull: false },
    cargo: { type: DataTypes.STRING(120) },
    email: { type: DataTypes.STRING(255) },
    telefono: { type: DataTypes.STRING(40) },
    es_principal: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'ClienteContacto', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
       indexes: [{ fields: ['cliente_id'] }] });
  return ClienteContacto;
};
// backend/src/models/clientes/ClienteEstado.js
export default (sequelize, DataTypes) => {
  const ClienteEstado = sequelize.define('ClienteEstado', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'ClienteEstado', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return ClienteEstado;
};
/**
 * ClienteHito
 * Hitos/Milestones por Cliente (Proyecto) para agrupar tareas.
 */
export default (sequelize, DataTypes) => {
  const ClienteHito = sequelize.define('ClienteHito', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cliente_id: { type: DataTypes.INTEGER, allowNull: false },
    nombre: { type: DataTypes.STRING(160), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    fecha_objetivo: { type: DataTypes.DATEONLY },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, { tableName: 'ClienteHito', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
       indexes: [{ fields: ['cliente_id'] }] });
  return ClienteHito;
};
// backend/src/models/clientes/ClienteTipo.js
export default (sequelize, DataTypes) => {
  const ClienteTipo = sequelize.define('ClienteTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    ponderacion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
    descripcion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'ClienteTipo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return ClienteTipo;
};