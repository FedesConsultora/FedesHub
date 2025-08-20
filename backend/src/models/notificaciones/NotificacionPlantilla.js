// backend/src/models/notificaciones/NotificacionPlantilla.js
export default (sequelize, DataTypes) => {
  const NotificacionPlantilla = sequelize.define('NotificacionPlantilla', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tipo_id: { type: DataTypes.INTEGER, allowNull: false },
    canal_id: { type: DataTypes.INTEGER, allowNull: false },
    idioma: { type: DataTypes.STRING(10), allowNull: false },
    asunto_tpl: { type: DataTypes.STRING(200) },
    cuerpo_tpl: { type: DataTypes.TEXT },
    data_schema_json: { type: DataTypes.TEXT },
    is_activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, { tableName: 'NotificacionPlantilla', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
       indexes: [{ unique: true, fields: ['tipo_id','canal_id','idioma'] }] });
  return NotificacionPlantilla;
};
