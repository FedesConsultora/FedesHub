// backend/src/models/comercial/Lead.js

export default (sequelize, DataTypes) => {
    const ComercialLead = sequelize.define('ComercialLead', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        nombre: { type: DataTypes.STRING(255), allowNull: false },
        apellido: { type: DataTypes.STRING(255) },
        empresa: { type: DataTypes.STRING(255) },
        alias: { type: DataTypes.STRING(255) },
        email: { type: DataTypes.STRING(255) },
        telefono: { type: DataTypes.STRING(100) },
        sitio_web: { type: DataTypes.STRING(255) },
        ubicacion: { type: DataTypes.TEXT },
        fuente_id: { type: DataTypes.INTEGER },
        responsable_feder_id: { type: DataTypes.INTEGER, allowNull: false },
        status_id: { type: DataTypes.INTEGER, allowNull: false },
        etapa_id: { type: DataTypes.INTEGER, allowNull: false },
        motivo_perdida_id: { type: DataTypes.INTEGER },
        motivo_perdida_comentario: { type: DataTypes.TEXT },
        ruta_post_negociacion: {
            type: DataTypes.ENUM('alta_directa', 'onboarding', 'pendiente'),
            allowNull: true
        },
        onboarding_tipo: { type: DataTypes.STRING(100) },
        onboarding_start_at: { type: DataTypes.DATE },
        onboarding_due_at: { type: DataTypes.DATE },
        onboarding_status: {
            type: DataTypes.ENUM('activo', 'vencido', 'revision_pendiente', 'completado', 'cancelado'),
            defaultValue: null
        },
        notif_7d_sent_at: { type: DataTypes.DATE },
        notif_3d_sent_at: { type: DataTypes.DATE },
        notif_expired_sent_at: { type: DataTypes.DATE },
        cliente_id: { type: DataTypes.INTEGER },
        created_by_user_id: { type: DataTypes.INTEGER },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        deleted_at: { type: DataTypes.DATE }
    }, {
        tableName: 'ComercialLead',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        paranoid: true // enables deleted_at
    });
    return ComercialLead;
};
