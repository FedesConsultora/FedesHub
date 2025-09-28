import { useCallback, useEffect, useState } from 'react';
import { tareasApi } from '../../../api/tareas';

export function useTaskAttachments(taskId, onAfterChange = () => {}) {
  const [adjuntos, setAdjuntos] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setAdjuntos(await tareasApi.getAdjuntos(taskId)); }
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

  const upload = useCallback(async (files = []) => {
    if (!files || !files.length) return;
    await tareasApi.uploadAdjuntos(taskId, files);
    await load();
    await onAfterChange();
  }, [taskId, load, onAfterChange]);

  return { adjuntos, loading, add, remove, upload, reload: load };
}