export default (sequelize, DataTypes) => {
    const TareaTCFormato = sequelize.define('TareaTCFormato', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        tarea_id: { type: DataTypes.INTEGER, allowNull: false },
        formato_id: { type: DataTypes.INTEGER, allowNull: false },
    }, {
        tableName: 'TareaTCFormato', underscored: true, timestamps: false,
        indexes: [{ unique: true, fields: ['tarea_id', 'formato_id'] }]
    });
    return TareaTCFormato;
};
