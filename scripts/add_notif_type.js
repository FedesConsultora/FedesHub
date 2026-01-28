// scripts/add_notif_type.js
import { initModels } from '../backend/src/models/registry.js';
import { sequelize } from '../backend/src/core/db.js';

async function run() {
    const m = await initModels();
    const now = new Date();

    try {
        const [[bzTareas]] = await sequelize.query(`SELECT id FROM "BuzonTipo" WHERE codigo='tareas' LIMIT 1`);
        if (!bzTareas) {
            console.error('Buzon "tareas" not found');
            process.exit(1);
        }

        await sequelize.query(`
            INSERT INTO "NotificacionTipo"(codigo, nombre, buzon_id, canales_default_json, created_at, updated_at)
            VALUES ('tarea_recordatorio', 'Recordatorio de tarea', :buzon_id, '["in_app", "push", "email"]'::jsonb, :now, :now)
            ON CONFLICT (codigo) DO UPDATE
            SET nombre = EXCLUDED.nombre,
                buzon_id = EXCLUDED.buzon_id,
                canales_default_json = EXCLUDED.canales_default_json,
                updated_at = EXCLUDED.updated_at;
        `, {
            replacements: {
                buzon_id: bzTareas.id,
                now
            }
        });
        console.log('Notification type added/updated successfully');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sequelize.close();
    }
}

run();
