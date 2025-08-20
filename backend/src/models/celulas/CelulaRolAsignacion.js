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
