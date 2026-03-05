
import { initModels } from './src/models/registry.js';
import { svcGoogleListCalendars } from './src/modules/calendario/services/google.service.js';

async function test() {
    const m = await initModels();
    const user_id = 15; // User found in DB
    try {
        const user = { id: user_id };
        console.log('--- Probando svcGoogleListCalendars ---');
        const res = await svcGoogleListCalendars(user);
        console.log('Calendarios:', res.length);
    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        process.exit();
    }
}

test();
