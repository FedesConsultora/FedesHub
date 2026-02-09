// /frontend/src/components/tasks/TaskList.jsx
import { useMemo, useState, useEffect } from "react";
import { Badge } from "../ui/badge";
import AvatarStack from "../common/AvatarStack";
import { getPriorityMeta } from "./priority-utils";
import { FiChevronUp, FiChevronDown, FiArrowUp, FiArrowDown } from "react-icons/fi";

const STATUS_COLORS = {
  pendiente: '#7A1B9F',
  en_curso: '#9F1B50',
  desarrollado: '#3b82f6',
  revision: '#1B6D9F',
  aprobada: '#1B9F4E',
  cancelada: '#9F1B1B',
}

export default function TaskList({
  rows = [],
  loading = false,
  maxRows,
  dense = false,
  showHeader = true,
  onRowClick,
  onOpenTask,
  attendanceStatuses = null,
  catalog = {},
  groupByClient = false,
  columns: cols = { cliente: true, estado: true, vence: true, progreso: true, responsables: true },
}) {
  // Estados para agrupamiento
  const [collapsedGroups, setCollapsedGroups] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tasks_list_collapsed') || '{}');
    } catch { return {}; }
  });

  const [groupOrder, setGroupOrder] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tasks_list_group_order') || '[]');
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('tasks_list_collapsed', JSON.stringify(collapsedGroups));
  }, [collapsedGroups]);

  useEffect(() => {
    localStorage.setItem('tasks_list_group_order', JSON.stringify(groupOrder));
  }, [groupOrder]);

  const toggleGroup = (clientId) => {
    setCollapsedGroups(prev => ({ ...prev, [clientId]: !prev[clientId] }));
  };

  const moveGroup = (clientId, direction) => {
    setGroupOrder(prev => {
      const idx = prev.indexOf(clientId);
      if (idx === -1) return prev;
      const newOrder = [...prev];
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= newOrder.length) return prev;
      [newOrder[idx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[idx]];
      return newOrder;
    });
  };

  const data = useMemo(() => {
    const r = Array.isArray(rows) ? rows : [];
    return Number.isFinite(maxRows) ? r.slice(0, maxRows) : r;
  }, [rows, maxRows]);

  // Agrupar filas
  const groupsData = useMemo(() => {
    if (!groupByClient) return [{ id: 'all', name: 'Todas las tareas', tasks: data }];

    const g = {};
    data.forEach(t => {
      const cid = t.cliente_id || 'unassigned';
      if (!g[cid]) {
        g[cid] = {
          id: cid,
          name: t.cliente_nombre || (cid === 'unassigned' ? 'Sin cliente' : 'Desconocido'),
          tasks: []
        };
      }
      g[cid].tasks.push(t);
    });
    return Object.values(g);
  }, [data, groupByClient]);

  // Sincronizar groupOrder con los clientes actuales
  useEffect(() => {
    if (!groupByClient) return;
    const currentIds = groupsData.map(gl => String(gl.id));

    setGroupOrder(prev => {
      const filtered = prev.filter(id => currentIds.includes(String(id)));
      const news = currentIds.filter(id => !prev.includes(String(id)));
      const combined = [...filtered, ...news];
      if (JSON.stringify(combined) !== JSON.stringify(prev)) return combined;
      return prev;
    });
  }, [groupsData, groupByClient]);

  // Grupos finales ordenados
  const groups = useMemo(() => {
    if (!groupByClient) return groupsData;
    return [...groupsData].sort((a, b) => {
      const idxA = groupOrder.indexOf(String(a.id));
      const idxB = groupOrder.indexOf(String(b.id));
      if (idxA === -1 || idxB === -1) return 0;
      return idxA - idxB;
    });
  }, [groupsData, groupOrder, groupByClient]);

  const RowPad = dense ? "py-2" : "py-3";

  const renderTable = (tasks, clientId = 'all') => (
    <div className="w-full overflow-auto rounded-3xl border">
      <table className="w-full text-sm fh-table">
        {showHeader && (
          <thead className="bg-muted/50 sticky top-0 z-10">
            <tr>
              <th className="text-left p-2" style={{ width: '40px' }}></th>
              <th className="text-left p-2 col-title">Tarea</th>
              {cols.cliente && clientId === 'all' && <th className="text-left p-3 hidden-mobile">Cliente</th>}
              {cols.responsables && <th className="text-left p-2 col-assigned" style={{ width: '80px' }}>Asignados</th>}
              {cols.estado && <th className="text-left p-2 col-status" style={{ width: '100px' }}>Estado</th>}
              {cols.vence && <th className="text-left p-3 hidden-mobile">Vence</th>}
              {cols.progreso && <th className="text-left p-3 hidden-mobile">Progreso</th>}
            </tr>
          </thead>
        )}
        <tbody className="cursor-pointer">
          {tasks.map((t) => {
            const due = t.vencimiento || t.due || null;
            const dueTxt = due ? new Date(due).toLocaleDateString() : "";
            const progreso = Number.isFinite(t.progreso_pct) ? t.progreso_pct : 0;
            const clickable = typeof onRowClick === "function";
            const prio = getPriorityMeta(t.prioridad_num || t.prioridad || 0, t.boost_manual || 0, due);
            const prioColor = prio.color;
            const hasBolt = prio.isBoosted;
            const allPeople = [...(t.responsables || []), ...(t.colaboradores || [])];
            const statusColor = STATUS_COLORS[t.estado_codigo] || '#94a3b8';

            return (
              <tr
                key={t.id}
                className={`border-t ${clickable ? "hover:bg-muted/30 cursor-pointer" : ""}`}
                style={t.vencida ? { backgroundColor: 'rgba(159, 27, 27, 0.08)' } : {}}
                onClick={() => {
                  if (typeof onRowClick === "function") onRowClick(t);
                  if (typeof onOpenTask === "function") onOpenTask(t.id);
                }}
              >
                <td className={`px-2 ${RowPad}`} style={{ width: '42px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div
                      style={{
                        width: 8, height: 8, borderRadius: '50%', background: prioColor,
                        boxShadow: prio.level > 0 ? `0 0 8px ${prioColor}` : 'none'
                      }}
                      title={prio.label}
                    />
                    {hasBolt && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#ffeb3b" style={{ filter: 'drop-shadow(0 0 4px rgba(255,235,59,0.6))' }}>
                        <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z" />
                      </svg>
                    )}
                  </div>
                </td>
                <td className={`px-3 ${RowPad} font-medium cursor-pointer col-title`} title={t.titulo || t.title}>
                  {t.titulo || t.title}
                </td>
                {cols.cliente && clientId === 'all' && (
                  <td className={`px-3 cursor-pointer ${RowPad} hidden-mobile`}>
                    {t.cliente_nombre || t.client?.name || "—"}
                  </td>
                )}
                {cols.responsables && (
                  <td className={`px-3 cursor-pointer ${RowPad} col-assigned`}>
                    <AvatarStack people={allPeople} size={24} attendanceStatuses={attendanceStatuses} />
                  </td>
                )}
                {cols.estado && (
                  <td className={`px-3 cursor-pointer ${RowPad} col-status`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Badge variant="secondary" style={{ backgroundColor: `${statusColor}20`, color: statusColor, borderColor: `${statusColor}40`, borderWidth: '1px', borderStyle: 'solid' }}>
                        {t.estado_nombre || t.stage || "—"}
                      </Badge>
                      {t.vencida && (
                        <Badge variant="destructive" style={{ fontSize: '0.62rem', padding: '1px 4px', backgroundColor: '#9F1B1B', color: 'white', fontWeight: '900', border: 'none' }}>
                          VENCIDA
                        </Badge>
                      )}
                    </div>
                  </td>
                )}
                {cols.vence && (
                  <td className={`px-3 cursor-pointer ${RowPad} hidden-mobile`} style={t.vencida ? { color: '#ff5252', fontWeight: 'bold' } : { color: 'var(--fh-muted)' }}>
                    {dueTxt}
                  </td>
                )}
                {cols.progreso && (
                  <td className={`px-3 cursor-pointer ${RowPad} hidden-mobile`}>
                    <div className="h-1.5 w-40 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${progreso}%` }} />
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (loading) {
    return (
      <div className="w-full overflow-auto rounded-3xl border opacity-70 animate-pulse">
        <table className="w-full text-sm fh-table">
          <tbody className="py-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-t"><td className="p-8"><div className="h-4 bg-muted rounded w-full" /></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="TaskList-grouped" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {groups.map((group, idx) => (
        <div key={group.id} className={`client-group-container ${collapsedGroups[group.id] ? 'is-minimized' : ''}`}>

          <div className="group-content">
            {renderTable(group.tasks, group.id)}
          </div>
        </div>
      ))}
      {!groups.length && (
        <div className="p-8 text-center text-muted-foreground border rounded-3xl">
          No hay tareas para mostrar.
        </div>
      )}
    </div>
  );
}
