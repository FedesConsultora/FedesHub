// backend/src/models/comercial/Venta.js

export default (sequelize, DataTypes) => {
    const ComercialVenta = sequelize.define('ComercialVenta', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        lead_id: { type: DataTypes.INTEGER, allowNull: false },
        eecc_id: { type: DataTypes.INTEGER, allowNull: false },
        q: { type: DataTypes.INTEGER, allowNull: false },
        mes_fiscal: { type: DataTypes.INTEGER, allowNull: false },
        fecha_venta: { type: DataTypes.DATE, allowNull: false }
    }, {
        tableName: 'ComercialVenta',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    return ComercialVenta;
};
