export default (sequelize, DataTypes) => {
    const TareaTCRedSocial = sequelize.define('TareaTCRedSocial', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        tarea_id: { type: DataTypes.INTEGER, allowNull: false },
        red_social_id: { type: DataTypes.INTEGER, allowNull: false },
    }, {
        tableName: 'TareaTCRedSocial', underscored: true, timestamps: false,
        indexes: [{ unique: true, fields: ['tarea_id', 'red_social_id'] }]
    });
    return TareaTCRedSocial;
};
