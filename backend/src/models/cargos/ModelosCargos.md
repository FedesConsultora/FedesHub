// backend/src/models/cargos/Cargo.js
export default (sequelize, DataTypes) => {
  const Cargo = sequelize.define('Cargo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    descripcion: { type: DataTypes.TEXT },
    ambito_id: { type: DataTypes.INTEGER, allowNull: false },
    is_activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'Cargo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return Cargo;
};
// backend/src/models/cargos/CargoAmbito.js
export default (sequelize, DataTypes) => {
  const CargoAmbito = sequelize.define('CargoAmbito', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'CargoAmbito', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
  return CargoAmbito;
};
// backend/src/models/cargos/FederCargo.js
export default (sequelize, DataTypes) => {
  const FederCargo = sequelize.define('FederCargo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    feder_id: { type: DataTypes.INTEGER, allowNull: false },
    cargo_id: { type: DataTypes.INTEGER, allowNull: false },
    es_principal: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    desde: { type: DataTypes.DATEONLY, allowNull: false },
    hasta: { type: DataTypes.DATEONLY },
    observacion: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'FederCargo', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false,
       indexes: [{ fields: ['feder_id','cargo_id','desde'] }] });
  return FederCargo;
};
