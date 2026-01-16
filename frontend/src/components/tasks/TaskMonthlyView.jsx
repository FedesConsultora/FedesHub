import { useState, useMemo, useEffect } from "react";
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday,
    parseISO,
    startOfToday,
    addWeeks,
    subWeeks
} from "date-fns";
import { es } from "date-fns/locale";
import { FiChevronLeft, FiChevronRight, FiClock, FiPlus, FiX } from "react-icons/fi";
import CreateTaskModal from "./CreateTaskModal";
import "./TaskMonthlyView.scss";


const STATUS_COLORS = {
    pendiente: '#7A1B9F',
    en_curso: '#9F1B50',
    revision: '#1B6D9F',
    aprobada: '#1B9F4E',
    cancelada: '#9F1B1B',
    postergado: '#d97706', // Naranja para postergado
}

export default function TaskMonthlyView({ rows = [], onOpenTask, filters, setFilters, catalog = {}, loading = false }) {
    const [viewMode, setViewMode] = useState("month"); // "month" o "week"
    const [expandedDay, setExpandedDay] = useState(null); // { date: string, tasks: [] }
    const [currentDate, setCurrentDate] = useState(() => {
        // Al iniciar, intentar usar el filtro de fecha existente si hay uno
        if (filters?.vencimiento_from) return parseISO(filters.vencimiento_from);
        return startOfToday();
    });

    // Al cambiar la fecha o el modo, actualizamos los filtros del padre
    useEffect(() => {
        const start = format(viewMode === "month" ? startOfMonth(currentDate) : startOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
        const end = format(viewMode === "month" ? endOfMonth(currentDate) : endOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd");

        setFilters(prev => {
            // Solo actualizar si los valores realmente cambiaron
            if (prev.vencimiento_from === start && prev.vencimiento_to === end && prev.limit === 1000) {
                return prev;
            }
            return {
                ...prev,
                vencimiento_from: start,
                vencimiento_to: end,
                limit: 1000
            };
        });
    }, [currentDate, viewMode, setFilters]);

    // Al desmontar, restaurar el limit original
    useEffect(() => {
        return () => {
            setFilters(prev => ({
                ...prev,
                vencimiento_from: undefined,
                vencimiento_to: undefined,
                limit: 500
            }));
        }
    }, [setFilters]);

    const handlePrev = () => {
        if (viewMode === "month") setCurrentDate(subMonths(currentDate, 1));
        else setCurrentDate(subWeeks(currentDate, 1));
    };

    const handleNext = () => {
        if (viewMode === "month") setCurrentDate(addMonths(currentDate, 1));
        else setCurrentDate(addWeeks(currentDate, 1));
    };

    const handleToday = () => setCurrentDate(startOfToday());

    const calendarDays = useMemo(() => {
        let start, end;
        if (viewMode === "month") {
            const startMonth = startOfMonth(currentDate);
            const endMonth = endOfMonth(currentDate);
            start = startOfWeek(startMonth, { weekStartsOn: 1 });
            end = endOfWeek(endMonth, { weekStartsOn: 1 });
        } else {
            start = startOfWeek(currentDate, { weekStartsOn: 1 });
            end = endOfWeek(currentDate, { weekStartsOn: 1 });
        }

        return eachDayOfInterval({ start, end });
    }, [currentDate, viewMode]);

    const tasksByDay = useMemo(() => {
        const map = {};
        rows.forEach(task => {
            if (!task.vencimiento) return;
            const dateKey = format(parseISO(task.vencimiento), "yyyy-MM-dd");
            if (!map[dateKey]) map[dateKey] = [];
            map[dateKey].push(task);
        });
        return map;
    }, [rows]);

    const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

    return (
        <div className="TaskMonthlyView">
            <header className="calendarHeader">
                <div className="monthInfo">
                    <h2>{((str) => str.charAt(0).toUpperCase() + str.slice(1))(format(currentDate, "MMMM yyyy", { locale: es }))}</h2>
                </div>

                <div className="calendarFilters">
                    <select
                        value={filters.tipo || ''}
                        onChange={(e) => setFilters(f => ({ ...f, tipo: e.target.value || undefined }))}
                        className="calSelect"
                    >
                        <option value="">Todos los tipos</option>
                        <option value="STD">Estándar</option>
                        <option value="TC">Publicación (TC)</option>
                        <option value="IT">IT</option>
                    </select>

                    <select
                        value={filters.cliente_id || ''}
                        onChange={(e) => setFilters(f => ({ ...f, cliente_id: e.target.value ? Number(e.target.value) : undefined }))}
                        className="calSelect"
                    >
                        <option value="">Todos los clientes</option>
                        {catalog.clientes?.map(c => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                    </select>
                </div>

                <div className="navButtons">
                    <button
                        className="modeToggle"
                        onClick={() => setViewMode(viewMode === "month" ? "week" : "month")}
                    >
                        {viewMode === "month" ? "Vista semanal" : "Vista mensual"}
                    </button>

                    <div className="divider" />
                    <button onClick={handlePrev} title="Anterior">
                        <FiChevronLeft />
                    </button>
                    <button className="todayBtn" onClick={handleToday}>
                        Hoy
                    </button>
                    <button onClick={handleNext} title="Siguiente">
                        <FiChevronRight />
                    </button>
                </div>
            </header>

            <div className={`calendarGrid mode-${viewMode} ${loading ? 'loadingOpacity' : ''}`}>
                {loading && <div className="calendarLoader">Cargando tareas...</div>}
                {weekDays.map(day => (
                    <div key={day} className="weekday">
                        {day}
                    </div>
                ))}

                {calendarDays.map((day, idx) => {
                    const dateKey = format(day, "yyyy-MM-dd");
                    const dayTasks = tasksByDay[dateKey] || [];
                    const isCurrentMonth = isSameMonth(day, currentDate);


                    return (
                        <div
                            key={idx}
                            className={`dayCell ${!isCurrentMonth ? 'notCurrentMonth' : ''} ${isToday(day) ? 'isToday' : ''}`}
                            onClick={(e) => {
                                if (e.target.closest('.taskItem')) return;
                                // Podríamos abrir el modal de creación aquí pasándole la fecha 'day'
                            }}
                        >
                            <div className="dayHeader">
                                <div className="dayNumber">{format(day, "d")}</div>
                                <button
                                    className="quickAdd"
                                    title="Añadir tarea para este día"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.dispatchEvent(new CustomEvent('calendar:quickAdd', {
                                            detail: { date: day, tipo: filters.tipo, cliente_id: filters.cliente_id }
                                        }));
                                    }}
                                >
                                    + Agregar Tarea
                                </button>
                            </div>


                            <div className="taskList">
                                {dayTasks.slice(0, 2).map(task => {
                                    const isPostergado = task.tipo === 'TC' && task.datos_tc?.estado_publicacion_id === 4;
                                    const color = isPostergado ? STATUS_COLORS.postergado : (STATUS_COLORS[task.estado_codigo] || '#94a3b8');

                                    return (
                                        <div
                                            key={task.id}
                                            className={`taskItem ${isPostergado ? 'is-postergado' : ''}`}
                                            style={{ borderLeftColor: color }}
                                            onClick={() => onOpenTask(task.id)}
                                            title={task.titulo}
                                        >
                                            {isPostergado && <span className="icon"><FiClock size={12} /></span>}
                                            <span className="txt">{task.titulo}</span>
                                        </div>
                                    );
                                })}
                                {dayTasks.length > 2 && (
                                    <button
                                        className="moreTasksBtn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedDay({ date: dateKey, tasks: dayTasks });
                                        }}
                                    >
                                        +{dayTasks.length - 2} más
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {expandedDay && (
                <div className="dayPopoverOverlay" onClick={() => setExpandedDay(null)}>
                    <div className="dayPopover" onClick={e => e.stopPropagation()}>
                        <header>
                            <span>Tareas del {format(parseISO(expandedDay.date), "d 'de' MMMM", { locale: es })}</span>
                            <button className="closePop" onClick={() => setExpandedDay(null)}><FiX /></button>
                        </header>
                        <div className="popList">
                            {expandedDay.tasks.map(task => {
                                const isPostergado = task.tipo === 'TC' && task.datos_tc?.estado_publicacion_id === 4;
                                const color = isPostergado ? STATUS_COLORS.postergado : (STATUS_COLORS[task.estado_codigo] || '#94a3b8');
                                return (
                                    <div
                                        key={task.id}
                                        className="popItem"
                                        onClick={() => { onOpenTask(task.id); setExpandedDay(null); }}
                                    >
                                        <span className="statusDot" style={{ backgroundColor: color }} />
                                        <div className="popContent">
                                            <span className="popTitle">{task.titulo}</span>
                                            <span className="popSubtitle">{task.cliente_nombre} • {task.estado_nombre}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
