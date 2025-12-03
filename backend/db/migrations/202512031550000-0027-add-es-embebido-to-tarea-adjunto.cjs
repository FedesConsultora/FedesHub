'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('TareaAdjunto', 'es_embebido', {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Indica si el archivo está embebido en la descripción de la tarea (true) o es un adjunto normal (false)'
        });

        // Add index for performance
        await queryInterface.addIndex('TareaAdjunto', ['es_embebido'], {
            name: 'idx_tarea_adjunto_es_embebido'
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeIndex('TareaAdjunto', 'idx_tarea_adjunto_es_embebido');
        await queryInterface.removeColumn('TareaAdjunto', 'es_embebido');
    }
};
