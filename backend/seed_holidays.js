import { initModels } from './src/models/registry.js';
const m = await initModels();

async function seed() {
    console.log('Seeding EventTypes...');
    const types = [
        { codigo: 'cumpleanos', nombre: '🎂 Cumpleaños', descripcion: 'Cumpleaños de equipo' },
        { codigo: 'feriado', nombre: '🇦🇷 Feriado', descripcion: 'Feriados nacionales' }
    ];
    for (const t of types) {
        await m.EventoTipo.findOrCreate({ where: { codigo: t.codigo }, defaults: t });
    }

    console.log('Seeding ARG Holidays 2026...');
    const holidays = [
        { fecha: '2026-01-01', nombre: 'Año Nuevo', es_irrenunciable: true },
        { fecha: '2026-03-24', nombre: 'Día de la Memoria', es_irrenunciable: true },
        { fecha: '2026-04-02', nombre: 'Día del Veterano y caídos en la Guerra de Malvinas', es_irrenunciable: true },
        { fecha: '2026-05-01', nombre: 'Día del Trabajador', es_irrenunciable: true },
        { fecha: '2026-05-25', nombre: 'Revolución de Mayo', es_irrenunciable: true },
        { fecha: '2026-06-20', nombre: 'Paso a la Inmortalidad del Gral. Belgrano', es_irrenunciable: true },
        { fecha: '2026-07-09', nombre: 'Día de la Independencia', es_irrenunciable: true },
        { fecha: '2026-12-08', nombre: 'Día de la Inmaculada Concepción', es_irrenunciable: true },
        { fecha: '2026-12-25', nombre: 'Navidad', es_irrenunciable: true }
    ];

    for (const h of holidays) {
        await m.Feriado.findOrCreate({ where: { fecha: h.fecha }, defaults: { ...h, color: '#e11d48' } });
    }

    console.log('Done.');
}
seed().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
