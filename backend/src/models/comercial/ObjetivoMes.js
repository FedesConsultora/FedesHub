// backend/src/models/comercial/ObjetivoMes.js

export default (sequelize, DataTypes) => {
    const ComercialObjetivoMes = sequelize.define('ComercialObjetivoMes', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        eecc_id: { type: DataTypes.INTEGER, allowNull: false },
        mes_calendario: { type: DataTypes.INTEGER, allowNull: false },
        qty_onb_mercado: { type: DataTypes.INTEGER, defaultValue: 0 },
        qty_plan_prom: { type: DataTypes.INTEGER, defaultValue: 0 },
        precio_onb_mercado_snapshot: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        precio_plan_prom_snapshot: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        total_objetivo_ars: { type: DataTypes.DECIMAL(15, 2), allowNull: false }
    }, {
        tableName: 'ComercialObjetivoMes',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    return ComercialObjetivoMes;
};
