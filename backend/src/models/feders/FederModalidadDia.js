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
