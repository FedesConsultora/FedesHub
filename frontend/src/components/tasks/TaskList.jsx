// /frontend/src/components/tasks/TaskList.jsx
import { useMemo } from "react";
import { Badge } from "../ui/badge";
import AvatarStack from "../common/AvatarStack";
import { getPriorityMeta } from "./priority-utils";

const STATUS_COLORS = {
  pendiente: '#7A1B9F',
  en_curso: '#9F1B50',
  revision: '#1B6D9F',
  aprobada: '#1B9F4E',
  cancelada: '#9F1B1B',
}

/**
 * TaskList — tabla reutilizable para tareas
 *
 * Props:
 * - rows:    array normalizado [{ id, titulo, cliente_nombre, estado_nombre, vencimiento, progreso_pct, prioridad, responsables, colaboradores }]
 * - loading: bool (muestra filas fantasma)
 * - maxRows: number | undefined (recorta visualmente; ideal dashboard=4)
 * - dense:   bool (altura compacta de filas)
 * - showHeader: bool (default true)
 * - onRowClick: fn(row) | opcional (fila clickeable)
 * - columns: { cliente, estado, vence, progreso, responsables } — toggles de columnas (todas true por defecto)
 * - attendanceStatuses: opcional, objeto con estados de asistencia
 */

export default function TaskList({
  rows = [],
  loading = false,
  maxRows,
  dense = false,
  showHeader = true,
  onRowClick,
  onOpenTask,
  attendanceStatuses = null,

  columns: cols = { cliente: true, estado: true, vence: true, progreso: true, responsables: true },
}) {
  const data = useMemo(() => {
    const r = Array.isArray(rows) ? rows : [];
    return Number.isFinite(maxRows) ? r.slice(0, maxRows) : r;
  }, [rows, maxRows]);

  const RowPad = dense ? "py-2" : "py-3";

  return (
    <div className="w-full overflow-auto rounded-3xl border">
      <table className="w-full text-sm fh-table">
        {showHeader && (
          <thead className="bg-muted/50 sticky top-0 z-10">
            <tr>
              <th className="text-left p-3" style={{ width: '32px' }}></th>
              <th className="text-left p-3">Tarea</th>
              {cols.cliente && <th className="text-left p-3">Cliente</th>}
              {cols.responsables && <th className="text-left p-3">Asignados</th>}
              {cols.estado && <th className="text-left p-3">Estado</th>}
              {cols.vence && <th className="text-left p-3">Vence</th>}
              {cols.progreso && <th className="text-left p-3">Progreso</th>}
            </tr>
          </thead>
        )}

        <tbody className="cursor-pointer" style={{ cursor: "pointer" }}>
          {loading &&
            Array.from({ length: Math.max(4, Math.min(8, maxRows || 8)) }).map(
              (_, i) => (
                <tr
                  key={`skeleton-${i}`}
                  className="border-t opacity-70 animate-pulse "
                >
                  <td className={`px-3 ${RowPad}`}>
                    <div className="h-3 w-3 bg-muted rounded-full" />
                  </td>
                  <td className={`px-3 cursor-pointer ${RowPad}`}>
                    <div className="h-3 w-48 bg-muted rounded " />
                  </td>
                  {cols.cliente && (
                    <td className={`px-3 cursor-pointer ${RowPad}`}>
                      <div className="h-3 w-32 bg-muted rounded" />
                    </td>
                  )}
                  {cols.responsables && (
                    <td className={`px-3 cursor-pointer ${RowPad}`}>
                      <div className="h-6 w-16 bg-muted rounded" />
                    </td>
                  )}
                  {cols.estado && (
                    <td className={`px-3 cursor-pointer ${RowPad}`}>
                      <div className="h-6 w-20 bg-muted rounded-full" />
                    </td>
                  )}
                  {cols.vence && (
                    <td className={`px-3 cursor-pointer ${RowPad}`}>
                      <div className="h-3 w-24 bg-muted rounded" />
                    </td>
                  )}
                  {cols.progreso && (
                    <td className={`px-3  cursor-pointer ${RowPad}`}>
                      <div className="h-1.5 w-40 bg-muted rounded-full" />
                    </td>
                  )}
                </tr>
              )
            )}

          {!loading && !data.length && (
            <tr className="border-t">
              <td
                colSpan={
                  2 +
                  (cols.cliente ? 1 : 0) +
                  (cols.responsables ? 1 : 0) +
                  (cols.estado ? 1 : 0) +
                  (cols.vence ? 1 : 0) +
                  (cols.progreso ? 1 : 0)
                }
                className="p-6 text-center text-muted-foreground"
              >
                No hay tareas para mostrar.
              </td>
            </tr>
          )}

          {!loading &&
            data.map((t) => {
              const due = t.vencimiento || t.due || null;
              const dueTxt = due ? new Date(due).toLocaleDateString() : "";
              const progreso = Number.isFinite(t.progreso_pct)
                ? t.progreso_pct
                : 0;
              const clickable = typeof onRowClick === "function";

              // Prioridad
              const prio = getPriorityMeta(Number(t.prioridad) || 0, due);
              const prioColor = prio.level >= 2 ? '#f44336' : prio.level === 1 ? '#ff9800' : 'transparent';

              // Combinar responsables y colaboradores
              const allPeople = [...(t.responsables || []), ...(t.colaboradores || [])];
              const statusColor = STATUS_COLORS[t.estado_codigo] || '#94a3b8';

              return (
                <tr
                  key={t.id}
                  className={`border-t ${clickable ? "hover:bg-muted/30 cursor-pointer" : ""}`}
                  onClick={() => {
                    if (typeof onRowClick === "function") onRowClick(t);
                    if (typeof onOpenTask === "function") onOpenTask(t.id);
                  }}
                >
                  {/* Indicador de prioridad */}
                  <td className={`px-2 ${RowPad}`} style={{ width: '32px' }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: prioColor,
                        boxShadow: prioColor !== 'transparent' ? `0 0 6px ${prioColor}` : 'none'
                      }}
                      title={prio.label}
                    />
                  </td>
                  <td className={`px-3 ${RowPad} font-medium cursor-pointer `}>
                    {t.titulo || t.title}
                  </td>
                  {cols.cliente && (
                    <td className={`px-3 cursor-pointer  ${RowPad}`}>
                      {t.cliente_nombre || t.client?.name || "—"}
                    </td>
                  )}
                  {cols.responsables && (
                    <td className={`px-3 cursor-pointer ${RowPad}`}>
                      <AvatarStack people={allPeople} size={24} attendanceStatuses={attendanceStatuses} />
                    </td>
                  )}
                  {cols.estado && (
                    <td className={`px-3 cursor-pointer  ${RowPad}`}>
                      <Badge
                        variant="secondary"
                        style={{
                          backgroundColor: `${statusColor}20`,
                          color: statusColor,
                          borderColor: `${statusColor}40`,
                          borderWidth: '1px',
                          borderStyle: 'solid'
                        }}
                      >
                        {t.estado_nombre || t.stage || "—"}
                      </Badge>
                    </td>
                  )}
                  {cols.vence && (
                    <td
                      className={`px-3 cursor-pointer  ${RowPad} text-muted-foreground`}
                    >
                      {dueTxt}
                    </td>
                  )}
                  {cols.progreso && (
                    <td className={`px-3 cursor-pointer  ${RowPad}`}>
                      <div className="h-1.5 w-40 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${progreso}%` }}
                        />
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
}
