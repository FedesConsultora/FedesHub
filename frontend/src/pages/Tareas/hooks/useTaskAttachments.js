import { useCallback, useEffect, useState } from 'react';
import { tareasApi } from '../../../api/tareas';
import { useUploadContext } from '../../../context/UploadProvider';

export function useTaskAttachments(taskId, onAfterChange = () => { }) {
    const [adjuntos, setAdjuntos] = useState([]);
    const [loading, setLoading] = useState(true);
    const uploadContext = useUploadContext();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await tareasApi.getAdjuntos(taskId);
            // Map drive_url to url for frontend compatibility, preserve all fields
            const mappedData = data.map(adj => ({
                ...adj,
                url: adj.drive_url || adj.url
            }));
            setAdjuntos(mappedData);
        }
        finally { setLoading(false); }
    }, [taskId]);

    useEffect(() => { load(); }, [load]);

    const add = useCallback(async ({ nombre, drive_url, mime = null, tamano_bytes = null }) => {
        if (!nombre?.trim() || !drive_url?.trim()) return;
        await tareasApi.postAdjunto(taskId, {
            nombre: nombre.trim(),
            drive_url: drive_url.trim(),
            mime,
            tamano_bytes
        });
        await load();
        await onAfterChange();
    }, [taskId, load, onAfterChange]);

    const remove = useCallback(async (adjId) => {
        await tareasApi.deleteAdjunto(adjId);
        await load();
        await onAfterChange();
    }, [load, onAfterChange]);

    // Upload usando el sistema global si está disponible
    const upload = useCallback(async (files = [], esEmbebido = true) => {
        if (!files || !files.length) return;

        // Si tenemos el context global, usarlo para uploads en background
        if (uploadContext?.queueUpload) {
            await uploadContext.queueUpload({
                taskId,
                files,
                esEmbebido,
                onComplete: async () => {
                    await load();
                    await onAfterChange();
                }
            });
        } else {
            // Fallback al método original (por compatibilidad)
            await tareasApi.uploadAdjuntos(taskId, files, esEmbebido);
            await load();
            await onAfterChange();
        }
    }, [taskId, load, onAfterChange, uploadContext]);

    return { adjuntos, loading, add, remove, upload, reload: load };
}