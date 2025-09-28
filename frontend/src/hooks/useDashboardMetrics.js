import { useEffect, useState } from 'react';
import { tareasApi } from '../api/tareas';

export default function useDashboardMetrics(){
  const [data, setData] = useState({ tareas_hoy:0, tareas_semana:0, clientes_activos:0, eventos_prox:0, loading:true });

  useEffect(() => {
    let alive = true;
    (async () => {
      const { rows } = await tareasApi.list({ solo_mias:true, include_archivadas:false, limit:200 });
      if (!alive) return;
      const today = new Date(); today.setHours(0,0,0,0);
      const dd = (iso) => iso ? Math.floor((new Date(iso) - today)/86400000) : 9999;
      const hoy = rows.filter(t => dd(t.vencimiento) <= 0).length;
      const semana = rows.filter(t => dd(t.vencimiento) <= 7).length;
      const clientes = new Set(rows.map(t => t.cliente_id)).size;
      setData({ tareas_hoy:hoy, tareas_semana:semana, clientes_activos:clientes, eventos_prox:0, loading:false });
    })().catch(() => setData(d => ({...d, loading:false})));
    return () => { alive = false; };
  }, []);

  return data;
}
