import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { federsApi } from "../../api/feders";
import useTasksBoard from "../../hooks/useTasksBoard";
import { tareasApi } from "../../api/tareas";
import FederBubblesFilter from "../../components/common/FederBubblesFilter";
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
import { FaStar, FaTrash } from "react-icons/fa";
import './components/modal-panel.scss';

import "./TasksPage.scss";


export default function TasksPage() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState(() => localStorage.getItem('tasks_view') || "kanban");
  const [showCreate, setShowCreate] = useState(false);
  const [openTaskId, setOpenTaskId] = useState(null);

  // Sincronizar openTaskId con el id de la ruta
  useEffect(() => {
    if (routeId) {
      setOpenTaskId(Number(routeId));
    } else {
      setOpenTaskId(null);
    }
  }, [routeId]);
  const [initialData, setInitialData] = useState({});
  const [rankedFeders, setRankedFeders] = useState([]);

  const handleSetView = (v) => {
    setView(v);
    localStorage.setItem('tasks_view', v);
  };


  const { roles } = useAuthCtx() || {};
  const toast = useToast();
  const modal = useModal();

  // Verificar si es directivo (case-insensitive para robustez)
  const isDirectivo = useMemo(() => {
    if (!Array.isArray(roles)) return false;
    return roles.some(r => {
      const role = String(r).toUpperCase();
      return role === 'NIVELA' || role === 'NIVELB' || role === 'DIRECTIVO' || role === 'ADMIN';
    });
  }, [roles]);

  const [catalog, setCatalog] = useState({
    clientes: [],
    estados: [],
    impactos: [],
    urgencias: [],
    tc_redes: [],
    tc_formatos: [],
    tc_obj_negocio: [],
    tc_obj_marketing: [],
    tc_estados_pub: []
  });
  const [trashCount, setTrashCount] = useState(0);

  useEffect(() => {
    tareasApi.catalog().then(c => {
      if (c.estados) {
        c.estados = c.estados.map(s => s.nombre === 'Revisión' ? { ...s, nombre: 'En Revisión' } : s);
      }
      setCatalog(c);
    }).catch(console.error);

    if (isDirectivo) {
      tareasApi.listTrash().then(tasks => setTrashCount(tasks.length || 0)).catch(() => { });
    }
    federsApi.getRankingTasks().then(setRankedFeders).catch(console.error);
  }, [isDirectivo]);

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
    feder_ids: [],
    include_archivadas: false,
    include_finalizadas: false,
    sort: "desc",
    // TC
    tipo: undefined,
    tc_red_social_id: undefined,
    tc_formato_id: undefined,
    tc_objetivo_negocio_id: undefined,
    inamovible: undefined,
    // Feders
    responsable_feder_ids: undefined,
    colaborador_feder_ids: undefined,
    limit: 500,
    orden_by: "prioridad",
  });

  const [initialCommentId, setInitialCommentId] = useState(null);

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

    const commentId = searchParams.get("c") || searchParams.get("commentId");
    if (commentId) setInitialCommentId(commentId);

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
        newParams.delete("c");
        newParams.delete("commentId");
        setSearchParams(newParams, { replace: true });
      }
    }

    // Manejar creación desde Lead
    const createFromLead = searchParams.get("createFromLead");
    if (createFromLead) {
      const leadName = searchParams.get("leadName") || 'Lead';
      setInitialData({
        lead_id: parseInt(createFromLead, 10),
        leadName: decodeURIComponent(leadName),
        fromLead: true,
        titulo: `Seguimiento: ${decodeURIComponent(leadName)}`,
        vencimiento: new Date().toISOString().split('T')[0]
      });
      setShowCreate(true);
      // Limpiar params
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("createFromLead");
      newParams.delete("leadName");
      setSearchParams(newParams, { replace: true });
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
  const boardFilters = useMemo(() => {
    if (view === "overdue") {
      const today = new Date().toISOString().split('T')[0];
      return { ...filters, vencimiento_to: today, include_finalizadas: false };
    }
    return filters;
  }, [filters, view]);

  const { board, rows, loading, moveTask, canChangeTo, refetch } = useTasksBoard(boardFilters);

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
        cliente_id: t.cliente_id,
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
              <i className="fi fi-rr-apps" style={{ marginRight: '4px', verticalAlign: 'middle' }}></i>
              <span>Kanban</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "list"}
              className={view === "list" ? "active" : ""}
              onClick={() => handleSetView("list")}
              title="Ver como lista"
            >
              <i className="fi fi-rr-list-check" style={{ marginRight: '4px', verticalAlign: 'middle' }}></i>
              <span>Lista</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "month"}
              className={view === "month" ? "active" : ""}
              onClick={() => handleSetView("month")}
              title="Ver por mes"
            >
              <i className="fi fi-rr-calendar" style={{ marginRight: '4px', verticalAlign: 'middle' }}></i>
              <span>Calendario</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "overdue"}
              className={view === "overdue" ? "active" : ""}
              onClick={() => handleSetView("overdue")}
              title="Ver vencidas"
              style={{
                borderLeft: '1px solid rgba(239, 68, 68, 0.2)',
                color: view === "overdue" ? 'white' : '#ef4444'
              }}
            >
              <i className="fi fi-rr-clock-three" style={{ marginRight: '4px', verticalAlign: 'middle' }}></i>
              <span>Vencidas</span>
            </button>
            <button
              type="button"
              className="one-pager-btn"
              onClick={() => navigate('/tareas/one-pager')}
              title="Ver One Pager"
              style={{
                marginLeft: '8px',
                background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
              }}
            >
              <i className="fi fi-rr-document-signed" style={{ marginRight: '6px' }}></i>
              One Pager
            </button>
          </div>

          <button
            className="submit"
            onClick={() => setShowCreate(true)}
          >
            + Nueva tarea
          </button>
        </div>
      </header>

      <div className="filters-and-bubbles">
        <TareasActiveChips
          value={filters}
          catalog={catalog}
          onChange={setFilters}
        />

        <div className="filter-actions-group">
          <div className="view-toggle-icons">
            <button
              className={`icon-view-btn fav ${view === 'starred' ? 'active' : ''}`}
              onClick={() => handleSetView(view === 'starred' ? 'list' : 'starred')}
              title="Ver destacados"
            >
              <FaStar />
            </button>
            {isDirectivo && (
              <button
                className={`icon-view-btn trash ${view === 'trash' ? 'active' : ''}`}
                onClick={() => handleSetView(view === 'trash' ? 'list' : 'trash')}
                title="Ver papelera"
              >
                <FaTrash />
                {trashCount > 0 && <span className="notif-dot">{trashCount}</span>}
              </button>
            )}
          </div>

          <FederBubblesFilter
            feders={rankedFeders}
            selectedIds={filters.feder_ids || []}
            onChange={ids => setFilters({ ...filters, feder_ids: ids, solo_mias: ids.length === 0 })}
          />
        </div>
      </div>

      <section className="results" data-view={view}>
        {view === "kanban" ? (
          <KanbanBoard
            board={board}
            moveTask={moveTask}
            canChangeTo={canChangeTo}
            onOpenTask={setOpenTaskId}
            onDelete={handleDeleteTask}
            canDelete={isDirectivo}
            attendanceStatuses={attendanceStatuses}
          />
        ) : view === "list" || view === "overdue" ? (
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
        <ModalPanel
          open={!!openTaskId}
          onClose={() => {
            setOpenTaskId(null);
            setInitialCommentId(null);
            navigate('/tareas');
          }}
        >
          <TaskDetail
            taskId={openTaskId}
            initialCommentId={initialCommentId}
            onUpdated={refetch}
            onClose={() => {
              setOpenTaskId(null);
              setInitialCommentId(null);
              navigate('/tareas');
            }}
          />
        </ModalPanel>
      )}
    </div>
  );
}
