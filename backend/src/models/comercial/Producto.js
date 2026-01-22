// backend/src/models/comercial/Producto.js

export default (sequelize, DataTypes) => {
    const ComercialProducto = sequelize.define('ComercialProducto', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        nombre: { type: DataTypes.STRING(100), allowNull: false },
        tipo: { type: DataTypes.ENUM('plan', 'onboarding'), allowNull: false },
        precio_actual: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
        es_onboarding_objetivo: { type: DataTypes.BOOLEAN, defaultValue: false },
        max_descuento_porc: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 }
    }, {
        tableName: 'ComercialProducto',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    return ComercialProducto;
};
