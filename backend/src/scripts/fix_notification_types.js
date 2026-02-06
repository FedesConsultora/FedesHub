
import { initModels } from '../models/registry.js';
import { sequelize } from '../core/db.js';

async function main() {
    await initModels();
    const [tipo, created] = await (await initModels()).NotificacionTipo.findOrCreate({
        where: { codigo: 'ausencia_rechazada' },
        defaults: {
            nombre: 'Ausencia rechazada',
            buzon_id: 1, // Tareas
            canales_default_json: ['in_app', 'email'],
            created_at: new Date(),
            updated_at: new Date()
        }
    });

    if (created) {
        console.log('Tipo "ausencia_rechazada" creado.');
    } else {
        console.log('Tipo "ausencia_rechazada" ya existía.');
        // Asegurar que tenga email habilitado por defecto
        if (!tipo.canales_default_json.includes('email')) {
            tipo.canales_default_json = [...tipo.canales_default_json, 'email'];
            await tipo.save();
            console.log('Canal email agregado a "ausencia_rechazada".');
        }
    }

    // También asegurar que ausencia_aprobada tenga email
    const tipoApr = await (await initModels()).NotificacionTipo.findOne({ where: { codigo: 'ausencia_aprobada' } });
    if (tipoApr && !tipoApr.canales_default_json.includes('email')) {
        tipoApr.canales_default_json = [...tipoApr.canales_default_json, 'email'];
        await tipoApr.save();
        console.log('Canal email agregado a "ausencia_aprobada".');
    }

    console.log('DONE');
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
