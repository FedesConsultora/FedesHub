
import { initModels } from './src/models/registry.js';

async function main() {
    const models = await initModels();
    const codes = ['ausencia_aprobada', 'ausencia_denegada', 'ausencia_rechazada'];

    for (const code of codes) {
        const t = await models.NotificacionTipo.findOne({ where: { codigo: code } });
        console.log(`TYPE ${code}:`, t ? 'FOUND' : 'NOT FOUND');
        if (t) {
            console.log(' - Canales default:', JSON.stringify(t.canales_default_json));
        }
    }
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
