'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();

        // 1. Estados
        await queryInterface.bulkInsert('ComercialLeadStatus', [
            { codigo: 'pendiente', nombre: 'Pendiente', color: '#64748b', created_at: now, updated_at: now },
            { codigo: 'proceso', nombre: 'En proceso', color: '#3b82f6', created_at: now, updated_at: now },
            { codigo: 'cerrado', nombre: 'Cerrado / Ganado', color: '#10b981', created_at: now, updated_at: now },
            { codigo: 'perdido', nombre: 'Perdido', color: '#ef4444', created_at: now, updated_at: now }
        ], {});

        // 2. Etapas
        await queryInterface.bulkInsert('ComercialLeadEtapa', [
            { codigo: 'contacto', nombre: 'Primer contacto', orden: 1, created_at: now, updated_at: now },
            { codigo: 'reunion', nombre: 'Llamada / Reunión', orden: 2, created_at: now, updated_at: now },
            { codigo: 'presupuesto', nombre: 'Envío de presupuesto', orden: 3, created_at: now, updated_at: now },
            { codigo: 'negociacion', nombre: 'Negociación', orden: 4, created_at: now, updated_at: now },
            { codigo: 'cierre', nombre: 'Cierre', orden: 5, created_at: now, updated_at: now }
        ], {});

        // 3. Fuentes
        await queryInterface.bulkInsert('ComercialLeadFuente', [
            { codigo: 'instagram', nombre: 'Instagram', created_at: now, updated_at: now },
            { codigo: 'linkedin', nombre: 'LinkedIn', created_at: now, updated_at: now },
            { codigo: 'referido', nombre: 'Referido', created_at: now, updated_at: now },
            { codigo: 'web', nombre: 'Sitio Web', created_at: now, updated_at: now },
            { codigo: 'otro', nombre: 'Otro', created_at: now, updated_at: now }
        ], {});

        // 4. Motivos de Pérdida
        await queryInterface.bulkInsert('ComercialLeadMotivoPerdida', [
            { codigo: 'precio', nombre: 'Precio muy alto', created_at: now, updated_at: now },
            { codigo: 'funcionalidad', nombre: 'Falta de funcionalidad clave', created_at: now, updated_at: now },
            { codigo: 'competencia', nombre: 'Eligió a la competencia', created_at: now, updated_at: now },
            { codigo: 'tiempo', nombre: 'Tiempos de entrega', created_at: now, updated_at: now },
            { codigo: 'sin_respuesta', nombre: 'El prospecto dejó de responder', created_at: now, updated_at: now },
            { codigo: 'onboarding_fail', nombre: 'No superó el onboarding', created_at: now, updated_at: now }
        ], {});
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('ComercialLeadMotivoPerdida', null, {});
        await queryInterface.bulkDelete('ComercialLeadFuente', null, {});
        await queryInterface.bulkDelete('ComercialLeadEtapa', null, {});
        await queryInterface.bulkDelete('ComercialLeadStatus', null, {});
    }
};
