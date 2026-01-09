export default (sequelize, DataTypes) => {
    const TCObjetivoMarketing = sequelize.define('TCObjetivoMarketing', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
        nombre: { type: DataTypes.STRING(100), allowNull: false },
        descripcion: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    }, { tableName: 'TCObjetivoMarketing', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
    return TCObjetivoMarketing;
};
