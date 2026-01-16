// backend/src/models/comercial/LeadFuente.js

export default (sequelize, DataTypes) => {
    const ComercialLeadFuente = sequelize.define('ComercialLeadFuente', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
        nombre: { type: DataTypes.STRING(100), allowNull: false },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    }, {
        tableName: 'ComercialLeadFuente',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    return ComercialLeadFuente;
};
