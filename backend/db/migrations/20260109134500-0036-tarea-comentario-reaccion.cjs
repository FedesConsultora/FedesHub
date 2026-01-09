'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('TareaComentarioReaccion', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            comentario_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'TareaComentario',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'User',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            emoji: {
                type: Sequelize.STRING(200),
                allowNull: false
            },
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        await queryInterface.addIndex('TareaComentarioReaccion', ['comentario_id', 'user_id', 'emoji'], {
            unique: true,
            name: 'tarea_comentario_reaccion_unique'
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('TareaComentarioReaccion');
    }
};
