// /frontend/src/components/tasks/TaskList.jsx
import { useMemo } from 'react'
import { Badge } from '../ui/badge'

/**
 * TaskList — tabla reutilizable para tareas
 *
 * Props:
 * - rows:    array normalizado [{ id, titulo, cliente_nombre, estado_nombre, vencimiento, progreso_pct }]
 * - loading: bool (muestra filas fantasma)
 * - maxRows: number | undefined (recorta visualmente; ideal dashboard=4)
 * - dense:   bool (altura compacta de filas)
 * - showHeader: bool (default true)
 * - onRowClick: fn(row) | opcional (fila clickeable)
 * - columns: { cliente, estado, vence, progreso } — toggles de columnas (todas true por defecto)
*/

export default function TaskList({
  rows = [],
  loading = false,
  maxRows,
  dense = false,
  showHeader = true,
  onRowClick,
  columns: cols = { cliente: true, estado: true, vence: true, progreso: true }
}) {
  const data = useMemo(() => {
    const r = Array.isArray(rows) ? rows : []
    return Number.isFinite(maxRows) ? r.slice(0, maxRows) : r
  }, [rows, maxRows])

  const RowPad = dense ? 'py-2' : 'py-3'

  return (
    <div className="w-full overflow-auto rounded-3xl border">
      <table className="w-full text-sm fh-table">
        {showHeader && (
          <thead className="bg-muted/50 sticky top-0 z-10">
            <tr>
              <th className="text-left p-3">Tarea</th>
              {cols.cliente && <th className="text-left p-3">Cliente</th>}
              {cols.estado && <th className="text-left p-3">Estado</th>}
              {cols.vence &&  <th className="text-left p-3">Vence</th>}
              {cols.progreso && <th className="text-left p-3">Progreso</th>}
            </tr>
          </thead>
        )}

        <tbody>
          {loading && (
            Array.from({ length: Math.max(4, Math.min(8, maxRows || 8)) }).map((_, i) => (
              <tr key={`skeleton-${i}`} className="border-t opacity-70 animate-pulse">
                <td className={`px-3 ${RowPad}`}><div className="h-3 w-48 bg-muted rounded" /></td>
                {cols.cliente && <td className={`px-3 ${RowPad}`}><div className="h-3 w-32 bg-muted rounded" /></td>}
                {cols.estado &&  <td className={`px-3 ${RowPad}`}><div className="h-6 w-20 bg-muted rounded-full" /></td>}
                {cols.vence &&   <td className={`px-3 ${RowPad}`}><div className="h-3 w-24 bg-muted rounded" /></td>}
                {cols.progreso &&<td className={`px-3 ${RowPad}`}><div className="h-1.5 w-40 bg-muted rounded-full" /></td>}
              </tr>
            ))
          )}

          {!loading && !data.length && (
            <tr className="border-t">
              <td colSpan={1 + (cols.cliente?1:0) + (cols.estado?1:0) + (cols.vence?1:0) + (cols.progreso?1:0)} className="p-6 text-center text-muted-foreground">
                No hay tareas para mostrar.
              </td>
            </tr>
          )}

          {!loading && data.map(t => {
            const due = t.vencimiento || t.due || null
            const dueTxt = due ? new Date(due).toLocaleDateString() : ''
            const progreso = Number.isFinite(t.progreso_pct) ? t.progreso_pct : 0
            const clickable = typeof onRowClick === 'function'

            return (
              <tr
                key={t.id}
                className={`border-t ${clickable ? 'cursor-pointer hover:bg-muted/30' : ''}`}
                onClick={clickable ? () => onRowClick(t) : undefined}
              >
                <td className={`px-3 ${RowPad} font-medium`}>{t.titulo || t.title}</td>
                {cols.cliente && (
                  <td className={`px-3 ${RowPad}`}>{t.cliente_nombre || t.client?.name || '—'}</td>
                )}
                {cols.estado && (
                  <td className={`px-3 ${RowPad}`}>
                    <Badge variant="secondary">{t.estado_nombre || t.stage || '—'}</Badge>
                  </td>
                )}
                {cols.vence && (
                  <td className={`px-3 ${RowPad} text-muted-foreground`}>{dueTxt}</td>
                )}
                {cols.progreso && (
                  <td className={`px-3 ${RowPad}`}>
                    <div className="h-1.5 w-40 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${progreso}%` }} />
                    </div>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
