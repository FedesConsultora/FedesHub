// backend/src/models/comercial/LeadHistorial.js

export default (sequelize, DataTypes) => {
    const ComercialLeadHistorial = sequelize.define('ComercialLeadHistorial', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        lead_id: { type: DataTypes.INTEGER, allowNull: false },
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        tipo_evento: { type: DataTypes.STRING(100), allowNull: false },
        descripcion: { type: DataTypes.TEXT },
        data_json: { type: DataTypes.JSONB },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    }, {
        tableName: 'ComercialLeadHistorial',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });
    return ComercialLeadHistorial;
};
