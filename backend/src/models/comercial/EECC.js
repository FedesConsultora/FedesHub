// backend/src/models/comercial/EECC.js

export default (sequelize, DataTypes) => {
    const ComercialEECC = sequelize.define('ComercialEECC', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        nombre: { type: DataTypes.STRING(50), allowNull: false },
        start_at: { type: DataTypes.DATE, allowNull: false },
        end_at: { type: DataTypes.DATE, allowNull: false }
    }, {
        tableName: 'ComercialEECC',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    return ComercialEECC;
};
