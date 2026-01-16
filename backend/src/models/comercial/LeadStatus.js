// backend/src/models/comercial/LeadStatus.js

export default (sequelize, DataTypes) => {
    const ComercialLeadStatus = sequelize.define('ComercialLeadStatus', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
        nombre: { type: DataTypes.STRING(100), allowNull: false },
        color: { type: DataTypes.STRING(20) },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    }, {
        tableName: 'ComercialLeadStatus',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    return ComercialLeadStatus;
};
