// backend/src/models/comercial/ObjetivoQ.js

export default (sequelize, DataTypes) => {
    const ComercialObjetivoQ = sequelize.define('ComercialObjetivoQ', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        eecc_id: { type: DataTypes.INTEGER, allowNull: false },
        q: { type: DataTypes.INTEGER, allowNull: false },
        monto_presupuestacion_ars: { type: DataTypes.DECIMAL(15, 2), allowNull: false }
    }, {
        tableName: 'ComercialObjetivoQ',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    return ComercialObjetivoQ;
};
