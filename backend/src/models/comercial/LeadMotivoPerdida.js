// backend/src/models/comercial/LeadMotivoPerdida.js

export default (sequelize, DataTypes) => {
    const ComercialLeadMotivoPerdida = sequelize.define('ComercialLeadMotivoPerdida', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
        nombre: { type: DataTypes.STRING(255), allowNull: false },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    }, {
        tableName: 'ComercialLeadMotivoPerdida',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    return ComercialLeadMotivoPerdida;
};
