// backend/src/models/usuarios/UserStatusPersonalizado.js

export default (sequelize, DataTypes) => {
    const UserStatusPersonalizado = sequelize.define('UserStatusPersonalizado', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        emoji: { type: DataTypes.STRING(20), allowNull: false },
        texto: { type: DataTypes.STRING(100), allowNull: false },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    }, {
        tableName: 'UserStatusPersonalizado',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    return UserStatusPersonalizado;
};
