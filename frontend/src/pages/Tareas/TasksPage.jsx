// /frontend/src/pages/tareas/TasksPage.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import useTasksBoard from "../../hooks/useTasksBoard";
import { tareasApi } from "../../api/tareas";
import TareasFilters, { TareasActiveChips } from "../../components/tasks/TareasFilters";
import KanbanBoard from "../../components/tasks/KanbanBoard";
import TaskList from "../../components/tasks/TaskList";
import TaskMonthlyView from "../../components/tasks/TaskMonthlyView";
import CreateTaskModal from "../../components/tasks/CreateTaskModal";
import ModalPanel from "./components/ModalPanel";
import TaskDetail from "./TaskDetail";
import TrashView from "./components/TrashView";
import FavoritesView from "./components/FavoritesView";
import { useAuthCtx } from "../../context/AuthContext";
import { useToast } from "../../components/toast/ToastProvider";
import { useModal } from "../../components/modal/ModalProvider";
import useAttendanceStatus from "../../hooks/useAttendanceStatus";
import './components/modal-panel.scss';

import "./TasksPage.scss";


export default function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState(() => localStorage.getItem('tasks_view') || "kanban");
  const [showCreate, setShowCreate] = useState(false);
  const [openTaskId, setOpenTaskId] = useState(null);
  const [initialData, setInitialData] = useState({});

  const handleSetView = (v) => {
    setView(v);
    localStorage.setItem('tasks_view', v);
  };


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
    // TC
    tc_redes: [],
    tc_formatos: [],
    tc_obj_negocio: [],
    tc_obj_marketing: [],
    tc_estados_pub: []
  });
  useEffect(() => {
    tareasApi.catalog().then(c => {
      // Mapear nombre de estado "Revisión" -> "En Revisión" solo en el front
      if (c.estados) {
        c.estados = c.estados.map(s => s.nombre === 'Revisión' ? { ...s, nombre: 'En Revisión' } : s);
      }
      setCatalog(c);
    }).catch(console.error);
  }, []);

  // filtros (compat con backend)
  const [filters, setFilters] = useState({
    q: undefined,
    cliente_id: undefined,
    estado_id: undefined,
    estado_codigo: undefined,
    impacto_id: undefined,
    urgencia_id: undefined,
    vencimiento_from: undefined,
    vencimiento_to: undefined,
    solo_mias: true,
    include_archivadas: false,
    include_finalizadas: false,
    sort: "desc",
    // TC
    tipo: undefined,
    tc_red_social_id: undefined,
    tc_formato_id: undefined,
    tc_objetivo_negocio_id: undefined,
    inamovible: undefined,
    limit: 500,
    orden_by: "prioridad",
  });

  // URL -> filtros (solo al montar)
  useEffect(() => {
    const patch = {};
    const keys = [
      "q",
      "cliente_id",
      "estado_id",
      "estado_codigo",
      "impacto_id",
      "urgencia_id",
      "vencimiento_from",
      "vencimiento_to",
      "orden_by",
      "sort",
      "solo_mias",
      "include_archivadas",
      "include_finalizadas",
      "tipo",
      "tc_red_social_id",
      "tc_formato_id",
      "tc_objetivo_negocio_id",
      "inamovible"
    ];
    keys.forEach((k) => {
      const v = searchParams.get(k);
      if (v !== null)
        patch[k] =
          k === "solo_mias" || k === "include_archivadas" || k === "include_finalizadas" ? v === "true" : v;
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

  // Listener para creación rápida desde calendario
  useEffect(() => {
    const handleQuickAdd = (e) => {
      const { date, tipo, cliente_id } = e.detail;
      setInitialData({
        vencimiento: date ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0] : '',
        tipo: tipo || filters.tipo || 'STD',
        cliente_id: cliente_id || filters.cliente_id
      });
      setShowCreate(true);
    };
    window.addEventListener('calendar:quickAdd', handleQuickAdd);
    return () => window.removeEventListener('calendar:quickAdd', handleQuickAdd);
  }, [filters.tipo]);

  useEffect(() => {
    const sp = new URLSearchParams();
    const urlKeys = [
      "q",
      "cliente_id",
      "estado_id",
      "estado_codigo",
      "impacto_id",
      "urgencia_id",
      "vencimiento_from",
      "vencimiento_to",
      "orden_by",
      "sort",
      "solo_mias",
      "include_archivadas",
      "include_finalizadas",
      "tipo",
      "tc_red_social_id",
      "tc_formato_id",
      "tc_objetivo_negocio_id",
      "inamovible"
    ];
    urlKeys.forEach((k) => {
      const v = filters[k];
      if (v !== "" && v !== undefined && v !== null) sp.set(k, String(v));
    });
    setSearchParams(sp, { replace: true });
  }, [filters, setSearchParams]);

  // data
  const { board, rows, loading, moveTask, refetch } = useTasksBoard(filters);

  // Recolectar todos los feder_ids únicos de la vista actual para el estado de asistencia
  const allFederIds = useMemo(() => {
    const ids = new Set();
    const processPeople = (people) => {
      if (!Array.isArray(people)) return;
      people.forEach(p => {
        const fid = p.feder?.id || p.feder_id || p.id;
        if (fid) ids.add(Number(fid));
      });
    };

    rows.forEach(t => {
      processPeople(t.responsables);
      processPeople(t.colaboradores);
    });

    return Array.from(ids);
  }, [rows]);

  const { statuses: attendanceStatuses } = useAttendanceStatus(allFederIds);

  // normaliza filas para TaskList
  const tableRows = useMemo(
    () =>
      rows.map((t) => ({
        id: t.id,
        titulo: t.titulo,
        cliente_nombre: t.cliente_nombre,
        estado_nombre: t.estado_nombre === 'Revisión' ? 'En Revisión' : t.estado_nombre,
        estado_id: t.estado_id,
        estado_codigo: t.estado_codigo,
        vencimiento: t.vencimiento,
        progreso_pct: t.progreso_pct ?? 0,
        prioridad: t.prioridad_num ?? t.prioridad ?? 0,
        boost_manual: t.boost_manual ?? 0,
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
      title: 'Mover a la papelera',
      message: `¿Estás seguro de que querés eliminar "${task.title || task.titulo}"? Podrás restaurarla desde la papelera durante 2 meses.`,
      okText: 'Eliminar',
      cancelText: 'Cancelar'
    });

    if (!ok) return;

    try {
      await tareasApi.delete(task.id);
      toast?.success('Tarea enviada a la papelera');
      refetch();
    } catch (err) {
      toast?.error(err?.fh?.message || 'No se pudo eliminar la tarea');
    }
  }, [isDirectivo, modal, toast, refetch]);

  return (
    <div className="TareasListPage">
      <header className="toolbar card">
        <div className="left">
          <h1>Tareas</h1>
          <div className="counter">{countTxt}</div>
        </div>

        <div className="center">
          <TareasFilters
            value={filters}
            catalog={catalog}
            onChange={setFilters}
            hideChips={true}
          />
        </div>

        <div className="right">
          <div className="segmented" role="tablist" aria-label="Vista">
            <button
              type="button"
              role="tab"
              aria-selected={view === "kanban"}
              className={view === "kanban" ? "active" : ""}
              onClick={() => handleSetView("kanban")}
              title="Ver en Kanban"
            >
              Kanban
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "list"}
              className={view === "list" ? "active" : ""}
              onClick={() => handleSetView("list")}
              title="Ver como lista"
            >
              Lista
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "month"}
              className={view === "month" ? "active" : ""}
              onClick={() => handleSetView("month")}
              title="Ver por mes"
            >
              Calendario
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "starred"}
              className={view === "starred" ? "active" : ""}
              onClick={() => handleSetView("starred")}
              title="Ver destacados"
            >
              Destacadas
            </button>
            {isDirectivo && (
              <button
                type="button"
                role="tab"
                aria-selected={view === "trash"}
                className={view === "trash" ? "active" : ""}
                onClick={() => handleSetView("trash")}
                title="Ver papelera"
              >
                Papelera
              </button>
            )}
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

      <TareasActiveChips
        value={filters}
        catalog={catalog}
        onChange={setFilters}
      />

      <section className="results" data-view={view}>
        {view === "kanban" ? (
          <KanbanBoard
            board={board}
            moveTask={moveTask}
            onOpenTask={setOpenTaskId}
            onDelete={handleDeleteTask}
            canDelete={isDirectivo}
            attendanceStatuses={attendanceStatuses}
          />
        ) : view === "list" ? (
          <TaskList
            onOpenTask={setOpenTaskId}
            rows={tableRows}
            loading={loading}
            onRowClick={(t) => setOpenTaskId(t.id)}
            attendanceStatuses={attendanceStatuses}
          />
        ) : view === "month" ? (
          <TaskMonthlyView
            rows={rows}
            onOpenTask={setOpenTaskId}
            filters={filters}
            setFilters={setFilters}
            catalog={catalog}
            loading={loading}
          />
        ) : view === "starred" ? (
          <FavoritesView onRemoveFavorite={refetch} />
        ) : (
          <TrashView onRestore={refetch} />
        )}
      </section>

      {showCreate && (
        <CreateTaskModal
          initialData={initialData}
          onClose={() => {
            setShowCreate(false);
            setInitialData({});
          }}
          onCreated={() => {
            setShowCreate(false);
            setInitialData({});
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
