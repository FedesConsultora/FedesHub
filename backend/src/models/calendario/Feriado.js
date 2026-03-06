// backend/src/models/calendario/Feriado.js
export default (sequelize, DataTypes) => {
    const Feriado = sequelize.define('Feriado', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        fecha: { type: DataTypes.DATEONLY, allowNull: false, unique: true },
        nombre: { type: DataTypes.STRING(120), allowNull: false },
        es_irrenunciable: { type: DataTypes.BOOLEAN, defaultValue: false },
        color: { type: DataTypes.STRING(20), defaultValue: '#e11d48' }, // rose-600
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    }, {
        tableName: 'Feriado',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    return Feriado;
};
