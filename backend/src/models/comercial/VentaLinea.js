// backend/src/models/comercial/VentaLinea.js

export default (sequelize, DataTypes) => {
    const ComercialVentaLinea = sequelize.define('ComercialVentaLinea', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        venta_id: { type: DataTypes.INTEGER, allowNull: false },
        producto_id: { type: DataTypes.INTEGER, allowNull: false },
        producto_nombre_snapshot: { type: DataTypes.STRING(100), allowNull: false },
        precio_bruto_snapshot: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        bonificado_ars: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
        precio_neto_snapshot: { type: DataTypes.DECIMAL(15, 2), allowNull: false }
    }, {
        tableName: 'ComercialVentaLinea',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    return ComercialVentaLinea;
};
