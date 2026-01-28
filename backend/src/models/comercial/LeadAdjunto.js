// backend/src/models/comercial/LeadAdjunto.js

export default (sequelize, DataTypes) => {
    const ComercialLeadAdjunto = sequelize.define('ComercialLeadAdjunto', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        lead_id: { type: DataTypes.INTEGER, allowNull: false },
        autor_user_id: { type: DataTypes.INTEGER, allowNull: false },
        nombre_original: { type: DataTypes.STRING(255), allowNull: false },
        mimetype: { type: DataTypes.STRING(100) },
        size: { type: DataTypes.BIGINT },
        key: { type: DataTypes.STRING(255), allowNull: false },
        url: { type: DataTypes.STRING(512) },
        nota_id: { type: DataTypes.INTEGER },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    }, {
        tableName: 'ComercialLeadAdjunto',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    return ComercialLeadAdjunto;
};
