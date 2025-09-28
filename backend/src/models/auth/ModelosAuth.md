// backend/src/models/auth/Accion.js
export default (sequelize, DataTypes) => {
  const Accion = sequelize.define('Accion', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'Accion', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return Accion;
};
// backend/src/models/auth/AuthEmailDominio.js
export default (sequelize, DataTypes) => {
  const AuthEmailDominio = sequelize.define('AuthEmailDominio', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    dominio: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    is_activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'AuthEmailDominio', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return AuthEmailDominio;
};
// backend/src/models/auth/JwtRevocacion.js
export default (sequelize, DataTypes) => {
  const JwtRevocacion = sequelize.define('JwtRevocacion', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    jti: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    user_id: { type: DataTypes.INTEGER },
    revoked_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    motivo: { type: DataTypes.TEXT }
  }, { tableName: 'JwtRevocacion', underscored: true, timestamps: false });
  return JwtRevocacion;
};
// backend/src/models/auth/Modulo.js
export default (sequelize, DataTypes) => {
  const Modulo = sequelize.define('Modulo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'Modulo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return Modulo;
};
// backend/src/models/auth/Permiso.js
export default (sequelize, DataTypes) => {
  const Permiso = sequelize.define('Permiso', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    modulo_id: { type: DataTypes.INTEGER, allowNull: false },
    accion_id: { type: DataTypes.INTEGER, allowNull: false },
    nombre: { type: DataTypes.STRING(150), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'Permiso', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
      indexes: [{ unique: true, fields: ['modulo_id','accion_id'] }]
    });
  return Permiso;
};
// backend/src/models/auth/Rol.js
export default (sequelize, DataTypes) => {
  const Rol = sequelize.define('Rol', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    descripcion: { type: DataTypes.TEXT },
    rol_tipo_id: { type: DataTypes.INTEGER, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'Rol', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return Rol;
};
// backend/src/models/auth/RolPermiso.js
export default (sequelize, DataTypes) => {
  const RolPermiso = sequelize.define('RolPermiso', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    rol_id: { type: DataTypes.INTEGER, allowNull: false },
    permiso_id: { type: DataTypes.INTEGER, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'RolPermiso', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false,
       indexes: [{ unique: true, fields: ['rol_id','permiso_id'] }] });
  return RolPermiso;
};
// backend/src/models/auth/RolTipo.js
export default (sequelize, DataTypes) => {
  const RolTipo = sequelize.define('RolTipo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'RolTipo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return RolTipo;
};
// backend/src/models/auth/User.js
export default (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    is_activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    email_dominio_id: { type: DataTypes.INTEGER, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'User', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return User;
};
// backend/src/models/auth/UserRol.js
export default (sequelize, DataTypes) => {
  const UserRol = sequelize.define('UserRol', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    rol_id: { type: DataTypes.INTEGER, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'UserRol', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false,
       indexes: [{ unique: true, fields: ['user_id','rol_id'] }] });
  return UserRol;
};
// backend/src/models/auth/PasswordReset.js
export default (sequelize, DataTypes) => {
  const PasswordReset = sequelize.define('PasswordReset', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    token: { type: DataTypes.STRING(128), allowNull: false, unique: true },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    used_at: { type: DataTypes.DATE },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'PasswordReset',
    underscored: true,
    timestamps: false
  });
  return PasswordReset;
};
