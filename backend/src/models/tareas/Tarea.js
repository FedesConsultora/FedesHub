// backend/src/models/tareas/Tarea.js
export default (sequelize, DataTypes) => {
  const Tarea = sequelize.define('Tarea', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cliente_id: { type: DataTypes.INTEGER, allowNull: false },
    hito_id: { type: DataTypes.INTEGER },
    tarea_padre_id: { type: DataTypes.INTEGER },
    titulo: { type: DataTypes.STRING(200), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    estado_id: { type: DataTypes.INTEGER, allowNull: false },
    creado_por_feder_id: { type: DataTypes.INTEGER, allowNull: false },
    requiere_aprobacion: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    aprobacion_estado_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    aprobado_por_user_id: { type: DataTypes.INTEGER },
    aprobado_at: { type: DataTypes.DATE },
    rechazado_por_user_id: { type: DataTypes.INTEGER },
    rechazado_at: { type: DataTypes.DATE },
    rechazo_motivo: { type: DataTypes.TEXT },
    cancelacion_motivo: { type: DataTypes.TEXT },
    fecha_inicio: { type: DataTypes.DATE },
    vencimiento: { type: DataTypes.DATE },
    impacto_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },
    urgencia_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 4 },
    prioridad_num: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    boost_manual: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    cliente_ponderacion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
    progreso_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0.00 },
    orden_kanban: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    tipo: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'STD' },
    is_archivada: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    finalizada_at: { type: DataTypes.DATE },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    deleted_at: { type: DataTypes.DATE },
    deleted_by_feder_id: { type: DataTypes.INTEGER }
  }, {
    tableName: 'Tarea', underscored: true, timestamps: true,
    paranoid: true, // Enables soft delete
    createdAt: 'created_at', updatedAt: 'updated_at', deletedAt: 'deleted_at',
    indexes: [
      { fields: ['cliente_id'] }, { fields: ['estado_id'] }, { fields: ['hito_id'] },
      { fields: ['vencimiento'] }, { fields: ['prioridad_num'] }, { fields: ['tarea_padre_id'] },
      { fields: ['deleted_at'] }, { fields: ['tipo'] }
    ]
  });
  return Tarea;
};