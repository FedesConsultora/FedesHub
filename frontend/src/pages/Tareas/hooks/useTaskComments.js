// Maneja listado y alta de comentarios con menciones por @id o @Nombre Apellido
import { useCallback, useEffect, useState } from 'react';
import { tareasApi } from '../../../api/tareas';

const escapeRx = (s='') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseMentions = (text='', feders=[]) => {
  const set = new Set();

  // 1) @123
  for (const m of text.matchAll(/@(\d+)/g)) {
    const id = Number(m[1]);
    if (!Number.isNaN(id)) set.add(id);
  }

  // 2) @Nombre Apellido
  for (const f of feders) {
    const full = `${f.nombre||''} ${f.apellido||''}`.trim();
    if (!full) continue;
    const re = new RegExp(`@${escapeRx(full)}\\b`, 'i');
    if (re.test(text)) set.add(f.id);
  }

  return [...set];
};

export function useTaskComments(taskId, cat) {
  const [comentarios, setComentarios] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setComentarios(await tareasApi.getComentarios(taskId)); }
    finally { setLoading(false); }
  }, [taskId]);

  useEffect(() => { load(); }, [load]);

  const add = useCallback(async ({ contenido, adjuntos = [], reply_to_id = null }) => {
    const tipoId = cat?.comentario_tipos?.[0]?.id;
    if (!contenido?.trim() && adjuntos.length === 0) return;
    if (!tipoId) return;
    const menciones = parseMentions(contenido, cat?.feders || []);
    await tareasApi.postComentario(taskId, { tipo_id: tipoId, contenido, menciones, adjuntos, reply_to_id });
    await load();
  }, [taskId, cat, load]);

  return { comentarios, loading, add, reload: load };
}
