/**
 * TareaHistorial
 * Registro de auditoría para todos los cambios realizados en tareas.
 * Soporta múltiples tipos de cambios con estructura flexible usando JSONB.
 */
export default (sequelize, DataTypes) => {
    const TareaHistorial = sequelize.define('TareaHistorial', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        tarea_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'ID de la tarea modificada'
        },
        feder_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'Usuario que realizó el cambio'
        },
        tipo_cambio: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'Tipo de cambio: estado, deadline, responsable, etc.'
        },
        accion: {
            type: DataTypes.STRING(20),
            allowNull: false,
            comment: 'Acción: created, updated, deleted, added, removed'
        },
        valor_anterior: {
            type: DataTypes.JSONB,
            comment: 'Valor antes del cambio (estructura flexible)'
        },
        valor_nuevo: {
            type: DataTypes.JSONB,
            comment: 'Valor después del cambio'
        },
        campo: {
            type: DataTypes.STRING(100),
            comment: 'Campo específico modificado (opcional)'
        },
        descripcion: {
            type: DataTypes.TEXT,
            comment: 'Descripción legible del cambio para mostrar al usuario'
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'TareaHistorial',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false, // Solo registramos cuándo se creó, no se puede editar historial
        indexes: [
            { fields: ['tarea_id'] },
            { fields: ['created_at'] },
            { fields: ['tipo_cambio'] },
            { fields: ['feder_id'] }
        ]
    });

    return TareaHistorial;
};
