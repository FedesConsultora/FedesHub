
import { initModels } from './src/models/registry.js';

async function check() {
    const m = await initModels();
    const accounts = await m.GoogleCuenta.findAll();
    console.log('Cuentas encontradas:', accounts.length);
    accounts.forEach(a => {
        console.log(`UserID: ${a.user_id}, Email: ${a.email}, HasToken: ${!!a.refresh_token_enc}`);
    });
    process.exit();
}
check();
