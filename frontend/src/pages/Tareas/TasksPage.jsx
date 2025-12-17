// /frontend/src/pages/tareas/TasksPage.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import useTasksBoard from "../../hooks/useTasksBoard";
import { tareasApi } from "../../api/tareas";
import TareasFilters from "../../components/tasks/TareasFilters";
import KanbanBoard from "../../components/tasks/KanbanBoard";
import TaskList from "../../components/tasks/TaskList";
import CreateTaskModal from "../../components/tasks/CreateTaskModal";
import ModalPanel from "./components/ModalPanel";
import TaskDetail from "./TaskDetail";
import { useAuthCtx } from "../../context/AuthContext";
import { useToast } from "../../components/toast/ToastProvider";
import { useModal } from "../../components/modal/ModalProvider";
import './components/modal-panel.scss';

import "./TasksPage.scss";


export default function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState("kanban");
  const [showCreate, setShowCreate] = useState(false);
  const [openTaskId, setOpenTaskId] = useState(null);


  const { roles } = useAuthCtx() || {};
  const toast = useToast();
  const modal = useModal();

  // Verificar si es directivo
  const isDirectivo = roles?.includes('NivelA') || roles?.includes('NivelB');

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

  // URL -> filtros (solo al montar)
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

  // Manejar el param 'open' para abrir una tarea directamente
  // Este effect reacciona a cambios en searchParams para funcionar aunque ya estés en /tareas
  useEffect(() => {
    const openParam = searchParams.get("open");
    if (openParam) {
      const taskId = parseInt(openParam, 10);
      if (taskId && !isNaN(taskId)) {
        setOpenTaskId(taskId);
        // Limpiar el param 'open' de la URL para evitar que se reabra al volver
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("open");
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [searchParams, setSearchParams]);

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
        prioridad: t.prioridad_num ?? t.prioridad ?? 0,
        // Mapear responsables: extraer datos del feder anidado
        responsables: (t.responsables || []).map(r => ({
          id: r.feder?.id || r.feder_id || r.id,
          nombre: r.feder?.nombre || r.nombre,
          apellido: r.feder?.apellido || r.apellido,
          avatar_url: r.feder?.avatar_url || r.avatar_url
        })),
        // Mapear colaboradores: extraer datos del feder anidado
        colaboradores: (t.colaboradores || []).map(c => ({
          id: c.feder?.id || c.feder_id || c.id,
          nombre: c.feder?.nombre || c.nombre,
          apellido: c.feder?.apellido || c.apellido,
          avatar_url: c.feder?.avatar_url || c.avatar_url
        }))
      })),
    [rows]
  );

  const countTxt = useMemo(() => {
    const showing = rows?.length ?? 0;
    // si en algún momento usas total paginado, reemplaza por `${showing} de ${total}`
    return `${showing} resultados`;
  }, [rows]);

  // Handler para eliminar tarea desde kanban/lista (solo directivos)
  const handleDeleteTask = useCallback(async (task) => {
    if (!isDirectivo) return;

    const ok = await modal.confirm({
      title: 'Eliminar tarea',
      message: `¿Estás seguro de que querés eliminar "${task.title || task.titulo}"? Esta acción no se puede deshacer.`,
      okText: 'Eliminar',
      cancelText: 'Cancelar'
    });

    if (!ok) return;

    try {
      await tareasApi.delete(task.id);
      toast?.success('Tarea eliminada');
      refetch();
    } catch (err) {
      toast?.error(err?.fh?.message || 'No se pudo eliminar la tarea');
    }
  }, [isDirectivo, modal, toast, refetch]);

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
          <KanbanBoard
            board={board}
            moveTask={moveTask}
            onOpenTask={setOpenTaskId}
            onDelete={handleDeleteTask}
            canDelete={isDirectivo}
          />
        ) : (
          <TaskList
            onOpenTask={setOpenTaskId}
            rows={tableRows}
            loading={loading}
            onRowClick={(t) => setOpenTaskId(t.id)}
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

      {openTaskId && (
        <ModalPanel open={!!openTaskId} onClose={() => setOpenTaskId(null)}>
          <TaskDetail
            taskId={openTaskId}
            onUpdated={refetch}
            onClose={() => setOpenTaskId(null)}
          />
        </ModalPanel>
      )}

    </div>
  );
}
