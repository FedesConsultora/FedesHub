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
