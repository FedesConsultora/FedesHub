// backend/src/models/comercial/Descuento.js

export default (sequelize, DataTypes) => {
    const ComercialDescuento = sequelize.define('ComercialDescuento', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        nombre: { type: DataTypes.STRING(100), allowNull: false },
        tipo: { type: DataTypes.ENUM('percentage', 'fixed'), allowNull: false },
        valor: { type: DataTypes.DECIMAL(15, 2), allowNull: false }
    }, {
        tableName: 'ComercialDescuento',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    return ComercialDescuento;
};
