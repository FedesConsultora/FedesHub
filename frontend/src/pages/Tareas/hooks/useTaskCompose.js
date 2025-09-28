// /src/pages/Tareas/hooks/useTaskCompose.js

// Trae catálogo + tarea (compose), memoiza catálogos relevantes y expone actions.
import { useEffect, useMemo, useState, useCallback } from 'react';
import { tareasApi } from '../../../api/tareas';

export function useTaskCompose(taskId) {
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState(null);
  const [t, setT] = useState(null);
  const [error, setError] = useState(null);

  const estado   = useMemo(() => cat?.estados?.find(e => e.id === t?.estado_id), [cat, t]);
  const aprob    = useMemo(() => cat?.aprobacion_estados?.find(e => e.id === t?.aprobacion_estado_id), [cat, t]);
  const impacto  = useMemo(() => cat?.impactos?.find(e => e.id === t?.impacto_id), [cat, t]);
  const urgencia = useMemo(() => cat?.urgencias?.find(e => e.id === t?.urgencia_id), [cat, t]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cmp = await tareasApi.compose(Number(taskId));
      setCat(cmp.catalog);
      setT(cmp.tarea);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const refresh = useCallback(async () => {
    try { setT(await tareasApi.get(taskId)); } catch (e) { setError(e); }
  }, [taskId]);

  const setEstado = useCallback(async (estado_id) => {
    await tareasApi.setEstado(taskId, estado_id);
    await refresh();
  }, [taskId, refresh]);

  const setAprobacion = useCallback(async (body) => {
    await tareasApi.setAprobacion(taskId, body);
    await refresh();
  }, [taskId, refresh]);

  useEffect(() => { let alive = true; (async () => { await load(); })(); return () => { alive = false; }; }, [load]);

  return { loading, error, cat, t, setT, estado, aprob, impacto, urgencia, refresh, setEstado, setAprobacion };
}
