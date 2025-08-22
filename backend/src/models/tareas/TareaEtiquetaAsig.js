// /backend/src/models/tareas/TareaEtiquetaAsig.js
export default (sequelize, DataTypes) => {
  const TareaEtiquetaAsig = sequelize.define('TareaEtiquetaAsig', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tarea_id: { type: DataTypes.INTEGER, allowNull: false },
    etiqueta_id: { type: DataTypes.INTEGER, allowNull: false },
  }, { tableName: 'TareaEtiquetaAsig', underscored: true, timestamps: false,
       indexes: [{ unique: true, fields: ['tarea_id','etiqueta_id'] }] });
  return TareaEtiquetaAsig;
};
