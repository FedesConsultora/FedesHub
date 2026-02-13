export default (sequelize, DataTypes) => {
    const Gasto = sequelize.define('Gasto', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        feder_id: { type: DataTypes.INTEGER, allowNull: false },
        descripcion: { type: DataTypes.TEXT, allowNull: false },
        monto: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        moneda: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'ARS' },
        fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        estado: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'pendiente'
        },
        aprobado_por_user_id: { type: DataTypes.INTEGER },
        aprobado_at: { type: DataTypes.DATE },
        rechazado_por_user_id: { type: DataTypes.INTEGER },
        rechazado_at: { type: DataTypes.DATE },
        rechazo_motivo: { type: DataTypes.TEXT },
        reintegrado_por_user_id: { type: DataTypes.INTEGER },
        reintegrado_at: { type: DataTypes.DATE },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    }, {
        tableName: 'Gasto', underscored: true, timestamps: true,
        createdAt: 'created_at', updatedAt: 'updated_at',
        indexes: [
            { fields: ['feder_id'] },
            { fields: ['estado'] },
            { fields: ['fecha'] }
        ]
    });
    return Gasto;
};
