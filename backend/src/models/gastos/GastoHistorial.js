export default (sequelize, DataTypes) => {
    const GastoHistorial = sequelize.define('GastoHistorial', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        gasto_id: { type: DataTypes.INTEGER, allowNull: false },
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        tipo_cambio: { type: DataTypes.STRING(50), allowNull: false },
        accion: { type: DataTypes.STRING(20), allowNull: false },
        valor_anterior: { type: DataTypes.JSONB },
        valor_nuevo: { type: DataTypes.JSONB },
        campo: { type: DataTypes.STRING(100) },
        descripcion: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    }, {
        tableName: 'GastoHistorial', underscored: true, timestamps: true,
        createdAt: 'created_at', updatedAt: false,
        indexes: [
            { fields: ['gasto_id'] },
            { fields: ['user_id'] },
            { fields: ['created_at'] }
        ]
    });
    return GastoHistorial;
};
