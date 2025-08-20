// backend/src/models/ausencias/Ausencia.js
export default (sequelize, DataTypes) => {
  const Ausencia = sequelize.define('Ausencia', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    feder_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo_id: { type: DataTypes.INTEGER, allowNull: false },
    estado_id: { type: DataTypes.INTEGER, allowNull: false },
    fecha_desde: { type: DataTypes.DATEONLY, allowNull: false },
    fecha_hasta: { type: DataTypes.DATEONLY, allowNull: false },
    es_medio_dia: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    mitad_dia_id: { type: DataTypes.SMALLINT },
    duracion_horas: { type: DataTypes.DECIMAL(10,2) }, // NUEVO (para unidad=horas)
    motivo: { type: DataTypes.TEXT },
    comentario_admin: { type: DataTypes.TEXT },
    aprobado_por_user_id: { type: DataTypes.INTEGER },
    aprobado_at: { type: DataTypes.DATE },
    denegado_motivo: { type: DataTypes.TEXT },
    creado_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    actualizado_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'Ausencia', underscored: true, timestamps: false });
  return Ausencia;
};