'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Añadir el campo 'tipo' a la tabla Tarea
        await queryInterface.addColumn('Tarea', 'tipo', {
            type: Sequelize.STRING(10),
            allowNull: false,
            defaultValue: 'STD',
            comment: 'Tipo de tarea: STD (Estándar), TC (Tabla de Contenido/Publicación), IT (IT)'
        });

        await queryInterface.addIndex('Tarea', ['tipo'], {
            name: 'idx_tarea_tipo'
        });

        // 2. Crear tablas de Catálogo para TC

        // TCRedSocial
        await queryInterface.createTable('TCRedSocial', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            nombre: { type: Sequelize.STRING(100), allowNull: false },
            descripcion: { type: Sequelize.TEXT },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        // TCFormato
        await queryInterface.createTable('TCFormato', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            nombre: { type: Sequelize.STRING(100), allowNull: false },
            descripcion: { type: Sequelize.TEXT },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        // TCObjetivoNegocio
        await queryInterface.createTable('TCObjetivoNegocio', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            nombre: { type: Sequelize.STRING(100), allowNull: false },
            descripcion: { type: Sequelize.TEXT },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        // TCObjetivoMarketing
        await queryInterface.createTable('TCObjetivoMarketing', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            nombre: { type: Sequelize.STRING(100), allowNull: false },
            descripcion: { type: Sequelize.TEXT },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        // TCEstadoPublicacion
        await queryInterface.createTable('TCEstadoPublicacion', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            nombre: { type: Sequelize.STRING(100), allowNull: false },
            descripcion: { type: Sequelize.TEXT },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        // 3. Crear tabla TareaTC (extensión)
        await queryInterface.createTable('TareaTC', {
            tarea_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                references: { model: 'Tarea', key: 'id' },
                onDelete: 'CASCADE'
            },
            objetivo_negocio_id: {
                type: Sequelize.INTEGER,
                references: { model: 'TCObjetivoNegocio', key: 'id' },
                onDelete: 'SET NULL'
            },
            objetivo_marketing_id: {
                type: Sequelize.INTEGER,
                references: { model: 'TCObjetivoMarketing', key: 'id' },
                onDelete: 'SET NULL'
            },
            estado_publicacion_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 1, // Por ahora asumimos 1 como default inicial
                references: { model: 'TCEstadoPublicacion', key: 'id' },
                onDelete: 'RESTRICT'
            },
            inamovible: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        // 4. Crear Pivot Tables

        // TareaTCRedSocial
        await queryInterface.createTable('TareaTCRedSocial', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            tarea_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'Tarea', key: 'id' },
                onDelete: 'CASCADE'
            },
            red_social_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'TCRedSocial', key: 'id' },
                onDelete: 'CASCADE'
            }
        });

        await queryInterface.addIndex('TareaTCRedSocial', ['tarea_id', 'red_social_id'], {
            unique: true,
            name: 'idx_tarea_tc_red_social_unique'
        });

        // TareaTCFormato
        await queryInterface.createTable('TareaTCFormato', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            tarea_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'Tarea', key: 'id' },
                onDelete: 'CASCADE'
            },
            formato_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'TCFormato', key: 'id' },
                onDelete: 'CASCADE'
            }
        });

        await queryInterface.addIndex('TareaTCFormato', ['tarea_id', 'formato_id'], {
            unique: true,
            name: 'idx_tarea_tc_formato_unique'
        });

        // 5. Sembrar valores básicos de catálogo

        // Redes
        await queryInterface.bulkInsert('TCRedSocial', [
            { codigo: 'IG', nombre: 'Instagram', created_at: new Date(), updated_at: new Date() },
            { codigo: 'LI', nombre: 'LinkedIn', created_at: new Date(), updated_at: new Date() },
            { codigo: 'TT', nombre: 'TikTok', created_at: new Date(), updated_at: new Date() },
            { codigo: 'YT', nombre: 'Youtube', created_at: new Date(), updated_at: new Date() },
            { codigo: 'YTS', nombre: 'Youtube Shorts', created_at: new Date(), updated_at: new Date() },
            { codigo: 'ADS', nombre: 'Publicidad', created_at: new Date(), updated_at: new Date() },
            { codigo: 'BLOG', nombre: 'Blog', created_at: new Date(), updated_at: new Date() }
        ]);

        // Formatos
        await queryInterface.bulkInsert('TCFormato', [
            { codigo: 'STORY', nombre: 'Historia', created_at: new Date(), updated_at: new Date() },
            { codigo: 'POST', nombre: 'Post', created_at: new Date(), updated_at: new Date() },
            { codigo: 'CAROUSEL', nombre: 'Carrusel', created_at: new Date(), updated_at: new Date() },
            { codigo: 'ANIM', nombre: 'Animación', created_at: new Date(), updated_at: new Date() },
            { codigo: 'REEL', nombre: 'Reel', created_at: new Date(), updated_at: new Date() },
            { codigo: 'IMG', nombre: 'Imagen', created_at: new Date(), updated_at: new Date() },
            { codigo: 'VIDEO', nombre: 'Video', created_at: new Date(), updated_at: new Date() },
            { codigo: 'COLAB', nombre: 'Colaboración', created_at: new Date(), updated_at: new Date() },
            { codigo: 'CMT', nombre: 'Comentario', created_at: new Date(), updated_at: new Date() },
            { codigo: 'PDF', nombre: 'PDF', created_at: new Date(), updated_at: new Date() }
        ]);

        // Objetivos Negocio
        await queryInterface.bulkInsert('TCObjetivoNegocio', [
            { codigo: 'INTER', nombre: 'Internacionalizarnos', created_at: new Date(), updated_at: new Date() },
            { codigo: 'RECLUTAR', nombre: 'Reclutar Profesionales', created_at: new Date(), updated_at: new Date() }
        ]);

        // Objetivos Marketing
        await queryInterface.bulkInsert('TCObjetivoMarketing', [
            { codigo: 'SB', nombre: 'Show Bussines', created_at: new Date(), updated_at: new Date() },
            { codigo: 'ENG', nombre: 'Engagment', created_at: new Date(), updated_at: new Date() },
            { codigo: 'VD', nombre: 'Ventas digitales', created_at: new Date(), updated_at: new Date() }
        ]);

        // Estados Publicación
        await queryInterface.bulkInsert('TCEstadoPublicacion', [
            { id: 1, codigo: 'PENDIENTE', nombre: 'Pendiente', created_at: new Date(), updated_at: new Date() },
            { id: 2, codigo: 'PUBLICADO', nombre: 'Publicado', created_at: new Date(), updated_at: new Date() },
            { id: 3, codigo: 'POSTERGADO', nombre: 'Postergado', created_at: new Date(), updated_at: new Date() },
            { id: 4, codigo: 'CANCELADO', nombre: 'Cancelado', created_at: new Date(), updated_at: new Date() }
        ]);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('TareaTCFormato');
        await queryInterface.dropTable('TareaTCRedSocial');
        await queryInterface.dropTable('TareaTC');
        await queryInterface.dropTable('TCEstadoPublicacion');
        await queryInterface.dropTable('TCObjetivoMarketing');
        await queryInterface.dropTable('TCObjetivoNegocio');
        await queryInterface.dropTable('TCFormato');
        await queryInterface.dropTable('TCRedSocial');
        await queryInterface.removeIndex('Tarea', 'idx_tarea_tipo');
        await queryInterface.removeColumn('Tarea', 'tipo');
    }
};
