import { initModels } from './backend/src/models/registry.js';
import { sequelize } from './backend/src/core/db.js';

const seed = async () => {
    try {
        const models = await initModels();

        console.log('Seeding TC catalogs...');

        const redes = [
            { codigo: 'IG', nombre: 'Instagram' },
            { codigo: 'LI', nombre: 'LinkedIn' },
            { codigo: 'TT', nombre: 'TikTok' },
            { codigo: 'YT', nombre: 'YouTube' },
            { codigo: 'YTS', nombre: 'YouTube Shorts' },
            { codigo: 'PUB', nombre: 'Publicidad' },
            { codigo: 'BL', nombre: 'Blog' }
        ];

        const formatos = [
            { codigo: 'HI', nombre: 'Historia' },
            { codigo: 'PO', nombre: 'Post' },
            { codigo: 'CA', nombre: 'Carrusel' },
            { codigo: 'AN', nombre: 'Animación' },
            { codigo: 'RE', nombre: 'Reel' },
            { codigo: 'IM', nombre: 'Imagen' },
            { codigo: 'VI', nombre: 'Video' },
            { codigo: 'CO', nombre: 'Colaboración' },
            { codigo: 'CM', nombre: 'Comentario' },
            { codigo: 'PDF', nombre: 'PDF' }
        ];

        const objNeg = [
            { codigo: 'INT', nombre: 'Internacionalizarnos' },
            { codigo: 'REC', nombre: 'Reclutar Profesionales' }
        ];

        const objMkt = [
            { codigo: 'SB', nombre: 'Show Bussines' },
            { codigo: 'ENG', nombre: 'Engagment' },
            { codigo: 'VD', nombre: 'Ventas digitales' }
        ];

        const estadosPub = [
            { id: 1, codigo: 'pendiente', nombre: 'Pendiente' },
            { id: 2, codigo: 'publicado', nombre: 'Publicado' },
            { id: 3, codigo: 'postergado', nombre: 'Postergado' },
            { id: 4, codigo: 'cancelado', nombre: 'Cancelado' }
        ];

        await sequelize.transaction(async (t) => {
            await models.TCRedSocial.bulkCreate(redes, { transaction: t, ignoreDuplicates: true });
            await models.TCFormato.bulkCreate(formatos, { transaction: t, ignoreDuplicates: true });
            await models.TCObjetivoNegocio.bulkCreate(objNeg, { transaction: t, ignoreDuplicates: true });
            await models.TCObjetivoMarketing.bulkCreate(objMkt, { transaction: t, ignoreDuplicates: true });
            await models.TCEstadoPublicacion.bulkCreate(estadosPub, { transaction: t, ignoreDuplicates: true });
        });

        console.log('TC catalogs seeded successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding TC catalogs:', err);
        process.exit(1);
    }
};

seed();
