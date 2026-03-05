
import { initModels } from './src/models/registry.js';
import * as googleSvc from './src/modules/calendario/services/google.service.js';
import * as eventosRepo from './src/modules/calendario/repositories/eventos.repo.js';

async function test() {
    const m = await initModels();
    console.log('--- Testing Sync Hook ---');

    // Buscar un evento que esté en un calendario vinculado
    const vinc = await m.CalendarioVinculo.findOne({
        where: { is_activo: true },
        include: [{ model: m.CalendarioLocal, as: 'calendarioLocal' }]
    });

    if (!vinc) {
        console.log('No active calendar link found for testing.');
        process.exit();
    }

    console.log(`Found linked calendar: ${vinc.calendarioLocal.nombre} (ID: ${vinc.calendario_local_id})`);

    // Simular upsert
    const dummyEvent = {
        calendario_local_id: vinc.calendario_local_id,
        tipo_codigo: 'reunion',
        visibilidad_codigo: 'equipo',
        titulo: 'Test Sync Antigravity ' + Date.now(),
        starts_at: new Date(Date.now() + 3600000).toISOString(),
        ends_at: new Date(Date.now() + 7200000).toISOString(),
        asistentes: []
    };

    const user = { id: vinc.calendarioLocal.feder_id || 1 }; // Probamos con el dueño o admin

    console.log('Upserting event locally...');
    const row = await eventosRepo.upsertEvent(dummyEvent, user);
    console.log(`Event created with ID: ${row.id}. Check backend logs for setImmediate google sync.`);

    setTimeout(() => {
        console.log('Done test script.');
        process.exit();
    }, 5000);
}

test().catch(err => {
    console.error(err);
    process.exit(1);
});
