// backend/src/models/tareas/TareaRecordatorio.js
import { DataTypes } from 'sequelize';

export default (sequelize) => {
    const TareaRecordatorio = sequelize.define('TareaRecordatorio', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        tarea_id: { type: DataTypes.INTEGER, allowNull: false },
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        fecha_recordatorio: { type: DataTypes.DATE, allowNull: false },
        enviado: { type: DataTypes.BOOLEAN, defaultValue: false },
        tipo: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'hub' }
    }, {
        tableName: 'TareaRecordatorio',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['tarea_id'] },
            { fields: ['user_id'] },
            { fields: ['fecha_recordatorio', 'enviado'] }
        ]
    });

    return TareaRecordatorio;
};
