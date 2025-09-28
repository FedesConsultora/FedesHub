// /src/pages/Tareas/hooks/useTaskChecklist.js

import { useCallback, useEffect, useState } from 'react';
import { tareasApi } from '../../../api/tareas';

export function useTaskChecklist(taskId, onAfterChange = () => {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await tareasApi.getChecklist(taskId)); }
    finally { setLoading(false); }
  }, [taskId]);

  useEffect(() => { load(); }, [load]);

  const add = useCallback(async (titulo) => {
    if (!titulo?.trim()) return;
    await tareasApi.addChecklist(taskId, titulo.trim());
    await load();
    await onAfterChange();
  }, [taskId, load, onAfterChange]);

  const toggle = useCallback(async (item) => {
    await tareasApi.patchChecklistItem(item.id, { is_done: !item.is_done });
    await load();
    await onAfterChange();
  }, [load, onAfterChange]);

  const reorder = useCallback(async (orden) => {
    await tareasApi.reorderChecklist(taskId, orden);
    await load();
    await onAfterChange();
  }, [taskId, load, onAfterChange]);

  const remove = useCallback(async (itemId) => {
    await tareasApi.deleteChecklistItem(itemId);
    await load();
    await onAfterChange();
  }, [load, onAfterChange]);

  return { items, loading, add, toggle, reorder, remove, reload: load };
}
