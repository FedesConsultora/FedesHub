// backend/src/models/tareas/TareaComentarioReaccion.js
export default (sequelize, DataTypes) => {
    const TareaComentarioReaccion = sequelize.define('TareaComentarioReaccion', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        comentario_id: { type: DataTypes.INTEGER, allowNull: false },
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        emoji: { type: DataTypes.STRING(200), allowNull: false },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    }, {
        tableName: 'TareaComentarioReaccion',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
            { unique: true, fields: ['comentario_id', 'user_id', 'emoji'] }
        ]
    });
    return TareaComentarioReaccion;
};
