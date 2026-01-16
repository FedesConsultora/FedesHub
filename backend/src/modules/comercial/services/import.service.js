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

    const res = { created: 0, updated: 0, errors: [] };

    for (const row of data) {
        try {
            const email = row.Email || row.email;
            const telefono = row.Teléfono || row.telefono || row['Telefono'];

            let existing = null;
            if (email) existing = await leadRepo.getLeadByEmail(email);
            if (!existing && telefono) existing = await leadRepo.getLeadByTelefono(telefono);

            const payload = {
                nombre: row.Nombre || row.nombre || 'Sin nombre',
                apellido: row.Apellido || row.apellido,
                empresa: row.Empresa || row.empresa,
                alias: row.Alias || row.alias,
                email: email,
                telefono: telefono,
                sitio_web: row['Sitio Web'] || row.sitio_web,
                ubicacion: row.Ubicacion || row.ubicación || row.ubicacion,
                responsable_feder_id: row.responsable_id || row['ID Responsable'] || 1, // Defaulting to 1 for now if not provided
                status_id: defaultStatus,
                etapa_id: defaultEtapa,
                created_by_user_id: userId
            };

            const fuenteName = row.Fuente || row.fuente;
            if (fuenteName) {
                const f = fuentes.find(f => f.nombre.toLowerCase() === fuenteName.toLowerCase());
                if (f) payload.fuente_id = f.id;
            }

            if (existing) {
                await leadRepo.updateLead(existing.id, payload);
                res.updated++;
            } else {
                await leadRepo.createLead(payload);
                res.created++;
            }
        } catch (e) {
            res.errors.push({ row, error: e.message });
        }
    }

    return res;
};
