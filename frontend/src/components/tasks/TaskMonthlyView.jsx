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
import { FiChevronLeft, FiChevronRight, FiPlus } from "react-icons/fi";
import CreateTaskModal from "./CreateTaskModal";
import "./TaskMonthlyView.scss";

const STATUS_COLORS = {
    pendiente: '#7A1B9F',
    en_curso: '#9F1B50',
    revision: '#1B6D9F',
    aprobada: '#1B9F4E',
    cancelada: '#9F1B1B',
}

export default function TaskMonthlyView({ rows = [], onOpenTask, filters, setFilters, loading = false }) {
    const [viewMode, setViewMode] = useState("month"); // "month" o "week"
    const [currentDate, setCurrentDate] = useState(() => {
        // Al iniciar, intentar usar el filtro de fecha existente si hay uno
        if (filters?.vencimiento_from) return parseISO(filters.vencimiento_from);
        return startOfToday();
    });
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);

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
                    <h2>{format(currentDate, "MMMM yyyy", { locale: es })}</h2>
                </div>
                <div className="navButtons">
                    <button
                        className="modeToggle"
                        onClick={() => setViewMode(viewMode === "month" ? "week" : "month")}
                    >
                        {viewMode === "month" ? "Ir a vista semanal" : "Ir a vista mensual"}
                    </button>

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

                    const handleCreateTask = (e) => {
                        e.stopPropagation();
                        setSelectedDate(dateKey);
                        setShowCreateModal(true);
                    };

                    return (
                        <div
                            key={idx}
                            className={`dayCell ${!isCurrentMonth ? 'notCurrentMonth' : ''} ${isToday(day) ? 'isToday' : ''}`}
                        >
                            <div className="dayNumber">{format(day, "d")}</div>

                            <button
                                className="createTaskBtn"
                                onClick={handleCreateTask}

                            >
                                Crear tarea  <FiPlus />
                            </button>

                            <div className="taskList">
                                {dayTasks.slice(0, 5).map(task => {
                                    const color = STATUS_COLORS[task.estado_codigo] || '#94a3b8';
                                    return (
                                        <div
                                            key={task.id}
                                            className="taskItem"
                                            style={{ borderLeftColor: color }}
                                            onClick={() => onOpenTask(task.id)}
                                            title={`${task.titulo} (${task.estado_nombre || task.estado_codigo})`}
                                        >
                                            {task.titulo}
                                        </div>
                                    );
                                })}
                                {dayTasks.length > 5 && (
                                    <div className="moreTasks">+{dayTasks.length - 5} más</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {showCreateModal && (
                <CreateTaskModal
                    onClose={() => {
                        setShowCreateModal(false);
                        setSelectedDate(null);
                    }}
                    onCreated={() => {
                        setShowCreateModal(false);
                        setSelectedDate(null);
                        // Trigger refetch by updating filters slightly
                        setFilters(prev => ({ ...prev }));
                    }}
                    initialVencimiento={selectedDate}
                />
            )}
        </div>
    );
}
