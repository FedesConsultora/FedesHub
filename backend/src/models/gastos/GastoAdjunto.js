export default (sequelize, DataTypes) => {
    const GastoAdjunto = sequelize.define('GastoAdjunto', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        gasto_id: { type: DataTypes.INTEGER, allowNull: false },
        nombre: { type: DataTypes.STRING(255) },
        mime_type: { type: DataTypes.STRING(120) },
        size: { type: DataTypes.BIGINT },
        url: { type: DataTypes.STRING(512) },
        drive_file_id: { type: DataTypes.STRING(255) },
        subido_por_feder_id: { type: DataTypes.INTEGER },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    }, {
        tableName: 'GastoAdjunto', underscored: true, timestamps: true,
        createdAt: 'created_at', updatedAt: 'updated_at',
        indexes: [{ fields: ['gasto_id'] }]
    });
    return GastoAdjunto;
};
