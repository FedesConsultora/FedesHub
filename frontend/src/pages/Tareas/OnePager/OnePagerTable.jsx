import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FiClock } from 'react-icons/fi';
import { useAuthCtx } from '../../../context/AuthContext';

const TagList = ({ items, className }) => {
    if (!items || items.length === 0) return <span className="placeholder">-</span>;
    return (
        <div className="tag-list">
            {items.map(item => {
                const brandClass = item.nombre?.toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9-]/g, '');
                return (
                    <span key={item.id} className={`tag ${className} brand--${brandClass}`}>
                        {item.nombre}
                    </span>
                );
            })}
        </div>
    );
};

const EditableCell = ({ value, onSave, className, useDebounce = false, readOnly = false, type = "text" }) => {
    const [editing, setEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);
    const [saved, setSaved] = useState(false);
    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
        if (!isTyping) {
            setTempValue(value);
        }
    }, [value, isTyping]);

    useEffect(() => {
        if (!useDebounce || !editing || tempValue === value || readOnly) return;
        if (type === 'date') return;

        const timer = setTimeout(() => {
            onSave(tempValue);
            setIsTyping(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }, 1000);

        return () => clearTimeout(timer);
    }, [tempValue, useDebounce, editing, onSave, value, readOnly, type]);

    const handleBlur = () => {
        setEditing(false);
        setIsTyping(false);
        if (tempValue !== value && !readOnly) {
            onSave(tempValue);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleBlur();
        if (e.key === 'Escape') {
            setEditing(false);
            setIsTyping(false);
            setTempValue(value);
        }
    };

    const handleChange = (e) => {
        setTempValue(e.target.value);
        if (useDebounce) setIsTyping(true);
    };

    const handleClick = () => {
        if (!readOnly) setEditing(true);
    };

    if (editing && !readOnly) {
        return (
            <div className={`editable-cell editing ${className || ''}`}>
                <input
                    type={type}
                    autoFocus
                    value={tempValue || ''}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (e.target.showPicker) e.target.showPicker();
                    }}
                />
            </div>
        );
    }

    let displayValue = value;
    if (type === 'date' && value) {
        try {
            // Se asume value en formato YYYY-MM-DD
            const [y, m, d] = value.split('-');
            const date = new Date(y, m - 1, d);
            displayValue = date.toLocaleDateString();
        } catch (e) {
            displayValue = value;
        }
    }

    return (
        <div
            className={`editable-cell ${saved ? 'flash-save' : ''} ${readOnly ? 'readonly' : ''} ${className || ''}`}
            onClick={handleClick}
        >
            {displayValue || <span className="placeholder">{readOnly ? '-' : (type === 'date' ? 'Sin fecha' : 'Hacer clic...')}</span>}
        </div>
    );
};

const SelectCell = ({ value, options, onSave, className, displayValue, readOnly = false }) => {
    const [editing, setEditing] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleChange = (e) => {
        const newVal = e.target.value;
        setEditing(false);
        if (newVal != value && !readOnly) {
            onSave(newVal);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }
    };

    const handleClick = () => {
        if (!readOnly) setEditing(true);
    };

    if (editing && !readOnly) {
        return (
            <div className={`editable-cell editing ${className || ''}`}>
                <select
                    autoFocus
                    value={value || ''}
                    onChange={handleChange}
                    onBlur={() => setEditing(false)}
                    onClick={(e) => e.stopPropagation()}
                >
                    <option value="">Seleccionar...</option>
                    {options.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.nombre}</option>
                    ))}
                </select>
            </div>
        );
    }

    return (
        <div
            className={`editable-cell select ${saved ? 'flash-save' : ''} ${readOnly ? 'readonly' : ''} ${className || ''}`}
            onClick={handleClick}
        >
            {displayValue || <span className="placeholder">-</span>}
        </div>
    );
};

const MultiSelectCell = ({ values = [], options = [], onSave, className, readOnly = false }) => {
    const [editing, setEditing] = useState(false);
    const [saved, setSaved] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!editing) return;
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setEditing(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [editing]);

    const handleToggle = (optId) => {
        if (readOnly) return;
        const currentIds = values.map(v => v.id);
        let nextIds;
        if (currentIds.includes(optId)) {
            nextIds = currentIds.filter(id => id !== optId);
        } else {
            nextIds = [...currentIds, optId];
        }

        onSave(nextIds);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleClick = () => {
        if (!readOnly) setEditing(true);
    };

    if (editing && !readOnly) {
        return (
            <div className={`editable-cell multi-editing ${className || ''}`} ref={containerRef}>
                <div className="multi-select-popup anim-fade-in">
                    {options.map(opt => {
                        const isSelected = values.some(v => v.id === opt.id);
                        return (
                            <label key={opt.id} className="multi-select-item">
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggle(opt.id)}
                                />
                                <span>{opt.nombre}</span>
                            </label>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div
            className={`editable-cell multi ${saved ? 'flash-save' : ''} ${readOnly ? 'readonly' : ''} ${className || ''}`}
            onClick={handleClick}
        >
            <TagList items={values} className={className ? className.split('-')[0] : ''} />
        </div>
    );
};

export default function OnePagerTable({ data, loading, filterType, catalog, onOpenTask, onOpenHistory, onUpdate }) {
    const { user, roles } = useAuthCtx();
    const isDirectivo = useMemo(() => roles?.includes('NivelB') || roles?.includes('NivelA'), [roles]);

    const checkEditPermission = (task) => {
        if (isDirectivo) return true;
        if (task.inamovible) return false;

        const myId = Number(user?.id);
        const creatorId = Number(task.creador_id);
        if (creatorId === myId) return true;

        const respIds = Array.isArray(task.responsable_ids) ? task.responsable_ids.map(Number) : [];
        const colabIds = Array.isArray(task.colaborador_ids) ? task.colaborador_ids.map(Number) : [];

        return respIds.includes(myId) || colabIds.includes(myId);
    };

    if (loading) {
        return (
            <div className="table-container">
                <div className="loading-overlay">
                    <i className="fi fi-rr-spinner anim-rotate"></i>
                    <p>Cargando datos...</p>
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="table-container">
                <div className="no-results">
                    <i className="fi fi-rr-search-alt"></i>
                    <p>No se encontraron tareas para este cliente.</p>
                </div>
            </div>
        );
    }

    const showTCColumns = filterType === 'ALL' || filterType === 'TC';

    return (
        <div className="table-container">
            <table>
                <thead>
                    <tr>
                        <th className="sticky-col sticky-col--title title-cell">Título</th>
                        <th className="type-cell">Tipo</th>
                        <th className="date-cell">Vencimiento</th>
                        <th className="status-cell">Estado</th>
                        {showTCColumns && (
                            <>
                                <th className="network-cell">Redes</th>
                                <th className="format-cell">Formatos</th>
                                <th className="pub-status-cell">Pub.</th>
                                <th className="marketing-obj-cell">Obj. Marketing</th>
                                <th className="business-obj-cell">Obj. Negocio</th>
                            </>
                        )}
                        <th className="actions-cell"></th>
                    </tr>
                </thead>
                <tbody>
                    {data.map(t => {
                        const statusClass = `row-status--${t.estado_codigo || 'pendiente'}`;
                        const typeClass = `row-type--${(t.tipo || 'it').toLowerCase()}`;

                        // Per-row permission calculation
                        const myId = Number(user?.id);
                        const isCreator = Number(t.creador_id) === myId;
                        const respIds = Array.isArray(t.responsable_ids) ? t.responsable_ids.map(Number) : [];
                        const colabIds = Array.isArray(t.colaborador_ids) ? t.colaborador_ids.map(Number) : [];

                        const isResponsible = respIds.includes(myId) || isCreator || isDirectivo;
                        const isCollaborator = colabIds.includes(myId);
                        const isParticipant = isResponsible || isCollaborator || isDirectivo;

                        // Status filtering: Collaborators/Responsibles (non-directors) cannot Approve or Cancel
                        const availableStatuses = (catalog?.estados || []).filter(s => {
                            if (isDirectivo) {
                                if (s.codigo === 'desarrollado' && t.tipo !== 'IT') return false;
                                return true;
                            }
                            // Only directors can set to 'aprobada' or 'cancelada'
                            if (s.codigo === 'aprobada' || s.codigo === 'cancelada') return false;
                            // 'desarrollado' only for IT
                            if (s.codigo === 'desarrollado' && t.tipo !== 'IT') return false;
                            return true;
                        });

                        return (
                            <tr key={t.id} className={`${statusClass} ${typeClass}`}>
                                <td className="sticky-col sticky-col--title title-cell">
                                    <div className="title-wrapper">
                                        <button className="edit-modal-btn" onClick={() => onOpenTask(t.id)} title="Abrir Detalle">
                                            <i className="fi fi-rr-expand"></i>
                                        </button>
                                        <span className="title-click" onClick={() => onOpenTask(t.id)}>
                                            {t.titulo}
                                        </span>
                                    </div>
                                </td>

                                <td className="type-cell">
                                    <span className={`badge ${(t.tipo || 'it').toLowerCase()}`}>
                                        {t.tipo}
                                    </span>
                                </td>

                                <td className="date-cell">
                                    <EditableCell
                                        type="date"
                                        readOnly={!isResponsible || !!t.inamovible}
                                        value={t.vencimiento ? new Date(t.vencimiento).toISOString().split('T')[0] : ''}
                                        onSave={(val) => onUpdate(t.id, { vencimiento: val })}
                                    />
                                </td>

                                <td className="status-cell">
                                    <SelectCell
                                        readOnly={!isParticipant}
                                        value={t.estado_id}
                                        displayValue={t.estado_nombre}
                                        options={availableStatuses}
                                        onSave={(val) => onUpdate(t.id, {
                                            estado_id: val,
                                            estado_nombre: catalog?.estados?.find(e => e.id == val)?.nombre,
                                            estado_codigo: catalog?.estados?.find(e => e.id == val)?.codigo
                                        })}
                                    />
                                </td>

                                {showTCColumns && (
                                    <>
                                        <td className="network-cell">
                                            <MultiSelectCell
                                                className="network-cell"
                                                readOnly={!isParticipant || t.tipo !== 'TC'}
                                                values={t.redes_sociales || []}
                                                options={catalog?.tc_redes || []}
                                                onSave={(ids) => onUpdate(t.id, {
                                                    tc: { red_social_ids: ids },
                                                    redes_sociales: (catalog?.tc_redes || []).filter(r => ids.includes(r.id))
                                                })}
                                            />
                                        </td>
                                        <td className="format-cell">
                                            <MultiSelectCell
                                                className="format-cell"
                                                readOnly={!isParticipant || t.tipo !== 'TC'}
                                                values={t.formatos || []}
                                                options={catalog?.tc_formatos || []}
                                                onSave={(ids) => onUpdate(t.id, {
                                                    tc: { formato_ids: ids },
                                                    formatos: (catalog?.tc_formatos || []).filter(f => ids.includes(f.id))
                                                })}
                                            />
                                        </td>
                                        <td className="pub-status-cell">
                                            <SelectCell
                                                readOnly={!isParticipant || t.tipo !== 'TC'}
                                                value={t.estado_publicacion_id}
                                                displayValue={t.estado_publicacion_nombre}
                                                options={catalog?.tc_estados_pub || []}
                                                onSave={(val) => onUpdate(t.id, {
                                                    tc: { estado_publicacion_id: val },
                                                    estado_publicacion_nombre: catalog?.tc_estados_pub?.find(e => e.id == val)?.nombre
                                                })}
                                            />
                                        </td>
                                        <td className="marketing-obj-cell">
                                            <SelectCell
                                                readOnly={!isParticipant || t.tipo !== 'TC'}
                                                value={t.objetivo_marketing_id}
                                                displayValue={t.objetivo_marketing_nombre}
                                                options={catalog?.tc_obj_marketing || []}
                                                onSave={(val) => onUpdate(t.id, {
                                                    tc: { objetivo_marketing_id: val },
                                                    objetivo_marketing_nombre: catalog?.tc_obj_marketing?.find(e => e.id == val)?.nombre
                                                })}
                                            />
                                        </td>
                                        <td className="business-obj-cell">
                                            <SelectCell
                                                readOnly={!isParticipant || t.tipo !== 'TC'}
                                                value={t.objetivo_negocio_id}
                                                displayValue={t.objetivo_negocio_nombre}
                                                options={catalog?.tc_obj_negocio || []}
                                                onSave={(val) => onUpdate(t.id, {
                                                    tc: { objetivo_negocio_id: val },
                                                    objetivo_negocio_nombre: catalog?.tc_obj_negocio?.find(e => e.id == val)?.nombre
                                                })}
                                            />
                                        </td>
                                    </>
                                )}

                                <td className="actions-cell">
                                    <button className="action-btn" onClick={() => onOpenHistory(t.id)} title="Ver Historial">
                                        <FiClock />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
