// /frontend/src/pages/tareas/TasksPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import useTasksBoard from "../../hooks/useTasksBoard";
import { tareasApi } from "../../api/tareas";
import TareasFilters from "../../components/tasks/TareasFilters";
import KanbanBoard from "../../components/tasks/KanbanBoard";
import TaskList from "../../components/tasks/TaskList";
import CreateTaskModal from "../../components/tasks/CreateTaskModal";
import "./TasksPage.scss";

export default function TasksPage() {
  const [view, setView] = useState("kanban");
  const [showCreate, setShowCreate] = useState(false);

  const navigate = useNavigate();
  // catálogo (selects)
  const [catalog, setCatalog] = useState({
    clientes: [],
    estados: [],
    impactos: [],
    urgencias: [],
  });
  useEffect(() => {
    tareasApi.catalog().then(setCatalog).catch(console.error);
  }, []);

  // filtros (compat con backend)
  const [filters, setFilters] = useState({
    q: undefined,
    cliente_id: undefined,
    estado_id: undefined,
    impacto_id: undefined,
    urgencia_id: undefined,
    vencimiento_from: undefined,
    vencimiento_to: undefined,
    solo_mias: true,
    include_archivadas: false,
    limit: 200,
    orden_by: "prioridad",
    sort: "desc",
  });

  // URL <-> filtros
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const patch = {};
    const keys = [
      "q",
      "cliente_id",
      "estado_id",
      "impacto_id",
      "urgencia_id",
      "vencimiento_from",
      "vencimiento_to",
      "orden_by",
      "sort",
      "solo_mias",
      "include_archivadas",
    ];
    keys.forEach((k) => {
      const v = searchParams.get(k);
      if (v !== null)
        patch[k] =
          k === "solo_mias" || k === "include_archivadas" ? v === "true" : v;
    });
    if (Object.keys(patch).length) setFilters((f) => ({ ...f, ...patch }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sp = new URLSearchParams();
    const urlKeys = [
      "q",
      "cliente_id",
      "estado_id",
      "impacto_id",
      "urgencia_id",
      "vencimiento_from",
      "vencimiento_to",
      "orden_by",
      "sort",
      "solo_mias",
      "include_archivadas",
    ];
    urlKeys.forEach((k) => {
      const v = filters[k];
      if (v !== "" && v !== undefined && v !== null) sp.set(k, String(v));
    });
    setSearchParams(sp, { replace: true });
  }, [filters, setSearchParams]);

  // data
  const { board, rows, loading, moveTask, refetch } = useTasksBoard(filters);

  // normaliza filas para TaskList
  const tableRows = useMemo(
    () =>
      rows.map((t) => ({
        id: t.id,
        titulo: t.titulo,
        cliente_nombre: t.cliente_nombre,
        estado_nombre: t.estado_nombre,
        vencimiento: t.vencimiento,
        progreso_pct: t.progreso_pct ?? 0,
      })),
    [rows]
  );

  const countTxt = useMemo(() => {
    const showing = rows?.length ?? 0;
    // si en algún momento usas total paginado, reemplaza por `${showing} de ${total}`
    return `${showing} resultados`;
  }, [rows]);

  return (
    <div className="TareasListPage">
      {/* Toolbar (igual a Clientes) */}
      <header className="toolbar card">
        <div className="left">
          <h1>Tareas</h1>
          <div className="counter">{countTxt}</div>
        </div>

        <div
          className="right"
          style={{ display: "flex", gap: 10, alignItems: "center" }}
        >
          <label className="onlyMine">
            <input
              type="checkbox"
              checked={!!filters.solo_mias}
              onChange={(e) =>
                setFilters((f) => ({ ...f, solo_mias: e.target.checked }))
              }
            />
            <span>Solo mías</span>
          </label>

          <div className="segmented" role="tablist" aria-label="Vista">
            <button
              type="button"
              role="tab"
              aria-selected={view === "kanban"}
              className={view === "kanban" ? "active" : ""}
              onClick={() => setView("kanban")}
              title="Ver en Kanban"
            >
              Kanban
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "list"}
              className={view === "list" ? "active" : ""}
              onClick={() => setView("list")}
              title="Ver como lista"
            >
              Lista
            </button>
          </div>

          <button
            className="submit"
            style={{ padding: "8px 12px", width: "auto" }}
            onClick={() => setShowCreate(true)}
          >
            + Nueva tarea
          </button>
        </div>
      </header>

      {/* Filtros (igual a Clientes, sin tarjeta) */}
      <section className="filters card">
        <TareasFilters
          value={filters}
          catalog={catalog}
          onChange={setFilters}
        />
      </section>

      {/* Resultados */}
      <section className="results" data-view={view}>
        {view === "kanban" ? (
          <KanbanBoard board={board} moveTask={moveTask} />
        ) : (
          <TaskList
            rows={tableRows}
            loading={loading}
            onRowClick={(t) => navigate(`/tareas/${t.id}`)}
          />
        )}
      </section>

      {showCreate && (
        <CreateTaskModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
