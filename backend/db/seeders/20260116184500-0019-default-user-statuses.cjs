'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Obtener todos los usuarios
        const [users] = await queryInterface.sequelize.query(
            'SELECT id FROM "User";'
        );

        if (users.length === 0) return;

        const defaultStatuses = [
            { emoji: '🔴', texto: 'Ocupado' },
            { emoji: '🤝', texto: 'En Reunión' },
            { emoji: '🥪', texto: 'Almorzando' }
        ];

        const recordsToInsert = [];
        const now = new Date();

        for (const user of users) {
            for (const status of defaultStatuses) {
                recordsToInsert.push({
                    user_id: user.id,
                    emoji: status.emoji,
                    texto: status.texto,
                    created_at: now,
                    updated_at: now
                });
            }
        }

        // Insertamos solo si no existen ya (opcional, pero más seguro)
        // Para simplificar, insertamos todos, asumiendo que es una migración/seed limpia
        // o usamos un ON CONFLICT si la tabla tiene un unique constraint apropiado.
        // Como no tiene unique constraint por (user_id, texto), simplemente insertamos.

        await queryInterface.bulkInsert('UserStatusPersonalizado', recordsToInsert);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('UserStatusPersonalizado', {
            texto: {
                [Sequelize.Op.in]: ['Ocupado', 'En Reunión', 'Almorzando']
            }
        });
    }
};
