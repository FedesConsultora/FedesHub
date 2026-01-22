// backend/src/models/comercial/DescuentoCap.js

export default (sequelize, DataTypes) => {
    const ComercialDescuentoCap = sequelize.define('ComercialDescuentoCap', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        eecc_id: { type: DataTypes.INTEGER, allowNull: false },
        q: { type: DataTypes.INTEGER, allowNull: false },
        monto_maximo_ars: { type: DataTypes.DECIMAL(15, 2), allowNull: false }
    }, {
        tableName: 'ComercialDescuentoCap',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    return ComercialDescuentoCap;
};
