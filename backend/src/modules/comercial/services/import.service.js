// backend/src/modules/comercial/services/import.service.js
import * as XLSX from 'xlsx';
import * as leadRepo from '../repositories/lead.repo.js';

export const svcImportLeads = async (buffer, userId) => {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws);

    const [statuses, etapas, fuentes] = await Promise.all([
        leadRepo.listStatuses(),
        leadRepo.listEtapas(),
        leadRepo.listFuentes()
    ]);

    const defaultStatus = statuses.find(s => s.codigo === 'pendiente')?.id;
    const defaultEtapa = etapas.find(e => e.codigo === 'contacto')?.id;
    const cliengoFuenteId = fuentes.find(f => f.nombre.toLowerCase() === 'cliengo')?.id;

    const res = { created: 0, updated: 0, errors: [] };

    // Helper to find column case-insensitively and with common variations
    const findValue = (row, ...keys) => {
        const rowKeys = Object.keys(row);
        for (const k of keys) {
            const foundKey = rowKeys.find(rk => rk.toLowerCase().trim() === k.toLowerCase().trim());
            if (foundKey) return row[foundKey];
        }
        return null;
    };

    for (const row of data) {
        try {
            const email = findValue(row, 'email', 'e-mail', 'Email address', 'Correo');
            const telefono = findValue(row, 'telefono', 'teléfono', 'tel', 'phone', 'phone number', 'celular');
            const nombreCompleto = findValue(row, 'nombre', 'name', 'full name', 'nombre completo');

            let existing = null;
            if (email) existing = await leadRepo.getLeadByEmail(email);
            if (!existing && telefono) existing = await leadRepo.getLeadByTelefono(telefono);

            const payload = {
                nombre: nombreCompleto || 'Sin nombre',
                apellido: findValue(row, 'apellido', 'last name'),
                empresa: findValue(row, 'empresa', 'company', 'organization'),
                alias: findValue(row, 'alias', 'main goal', 'página title', 'interés'),
                email: email,
                telefono: telefono,
                sitio_web: findValue(row, 'sitio web', 'website', 'sitio', 'url'),
                ubicacion: findValue(row, 'ubicacion', 'ubicación', 'location', 'city', 'provincia'),
                responsable_feder_id: findValue(row, 'responsable_id', 'id responsable', 'feder_id') || 1,
                status_id: defaultStatus,
                etapa_id: defaultEtapa,
                created_by_user_id: userId
            };

            // Detect Cliengo automatically
            const isCliengo = !!findValue(row, 'Full Name', 'Main Goal', 'Email address');
            if (isCliengo && cliengoFuenteId) {
                payload.fuente_id = cliengoFuenteId;
            } else {
                const fuenteName = findValue(row, 'fuente', 'source');
                if (fuenteName) {
                    const f = fuentes.find(f => f.nombre.toLowerCase() === fuenteName.toLowerCase().trim());
                    if (f) payload.fuente_id = f.id;
                }
            }

            if (existing) {
                await leadRepo.updateLead(existing.id, payload);
                res.updated++;
            } else {
                const newLead = await leadRepo.createLead(payload);
                res.created++;

                // If Cliengo, maybe add "Main Goal" as a first note
                const goal = findValue(row, 'Main Goal');
                if (goal && newLead.id) {
                    await leadRepo.addNota({
                        lead_id: newLead.id,
                        user_id: userId,
                        contenido: `Consulta inicial (Cliengo): ${goal}`
                    });
                }
            }
        } catch (e) {
            res.errors.push({ row, error: e.message });
        }
    }

    return res;
};
