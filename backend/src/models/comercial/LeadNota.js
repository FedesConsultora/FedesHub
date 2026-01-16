// backend/src/models/comercial/LeadNota.js

export default (sequelize, DataTypes) => {
    const ComercialLeadNota = sequelize.define('ComercialLeadNota', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        lead_id: { type: DataTypes.INTEGER, allowNull: false },
        autor_user_id: { type: DataTypes.INTEGER, allowNull: false },
        contenido: { type: DataTypes.TEXT, allowNull: false },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    }, {
        tableName: 'ComercialLeadNota',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    return ComercialLeadNota;
};
