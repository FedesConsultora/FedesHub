// backend/src/models/comercial/LeadEtapa.js

export default (sequelize, DataTypes) => {
    const ComercialLeadEtapa = sequelize.define('ComercialLeadEtapa', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
        nombre: { type: DataTypes.STRING(100), allowNull: false },
        orden: { type: DataTypes.INTEGER, defaultValue: 0 },
        color: { type: DataTypes.STRING(20) },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    }, {
        tableName: 'ComercialLeadEtapa',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    return ComercialLeadEtapa;
};
