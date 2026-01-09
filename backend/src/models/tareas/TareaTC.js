export default (sequelize, DataTypes) => {
    const TareaTC = sequelize.define('TareaTC', {
        tarea_id: { type: DataTypes.INTEGER, primaryKey: true },
        objetivo_negocio_id: { type: DataTypes.INTEGER },
        objetivo_marketing_id: { type: DataTypes.INTEGER },
        estado_publicacion_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
        inamovible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    }, { tableName: 'TareaTC', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
    return TareaTC;
};
