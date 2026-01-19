// frontend/src/components/tasks/TareasFilters.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { FaRegCalendarAlt, FaFilter, FaSearch, FaTimes, FaUser, FaArchive } from 'react-icons/fa'
import { FiLock, FiUnlock, FiCheckCircle, FiClock, FiBriefcase } from 'react-icons/fi'
import './TareasFilters.scss'

function Field({ id, label, children, className = '' }) {
  return (<label htmlFor={id} className={`Field ${className}`}>
    <span className="Field__label">{label}</span>{children}
  </label>)
}

const DateInput = ({ id, ...props }) => (
  <div className="InputDate">
    <FaRegCalendarAlt className="InputDate__icon" aria-hidden="true" />
    <input id={id} type="date" {...props} />
  </div>
)

export function useActiveChips(v, catalog) {
  return useMemo(() => {
    const chips = [];
    if (!v || !catalog) return chips;

    if (v.cliente_id) {
      const clienteId = Number(v.cliente_id);
      const cliente = catalog.clientes?.find(c => Number(c.id) === clienteId);
      chips.push({ key: 'cliente_id', label: cliente?.nombre || `Cliente #${clienteId}`, color: cliente?.color });
    }
    if (v.estado_id) {
      const estadoId = Number(v.estado_id);
      const estado = catalog.estados?.find(s => Number(s.id) === estadoId);
      chips.push({ key: 'estado_id', label: estado?.nombre || `Estado #${estadoId}` });
    }
    if (v.estado_codigo) {
      const estado = catalog.estados?.find(s => s.codigo === v.estado_codigo);
      chips.push({ key: 'estado_codigo', label: estado?.nombre || v.estado_codigo });
    }
    if (v.impacto_id) {
      const impactoId = Number(v.impacto_id);
      const impacto = catalog.impactos?.find(i => Number(i.id) === impactoId);
      chips.push({ key: 'impacto_id', label: `Impacto: ${impacto?.nombre || impactoId}` });
    }
    if (v.urgencia_id) {
      const urgenciaId = Number(v.urgencia_id);
      const urgencia = catalog.urgencias?.find(u => Number(u.id) === urgenciaId);
      chips.push({ key: 'urgencia_id', label: `Urgencia: ${urgencia?.nombre || urgenciaId}` });
    }
    if (v.vencimiento_from || v.vencimiento_to) {
      let label = 'Vence: ';
      if (v.vencimiento_from && v.vencimiento_to) {
        label += `${v.vencimiento_from} - ${v.vencimiento_to}`;
      } else if (v.vencimiento_from) {
        label += `desde ${v.vencimiento_from}`;
      } else {
        label += `hasta ${v.vencimiento_to}`;
      }
      chips.push({ key: 'vencimiento', label });
    }
    if (v.orden_by && v.orden_by !== 'prioridad') {
      const ordenLabels = {
        vencimiento: 'Vencimiento',
        fecha_inicio: 'Inicio',
        created_at: 'Creación',
        updated_at: 'Actualización',
        cliente: 'Cliente',
        titulo: 'Título'
      };
      chips.push({ key: 'orden', label: `${ordenLabels[v.orden_by] || v.orden_by} ${v.sort === 'asc' ? '↑' : '↓'}` });
    }
    if (v.include_archivadas) {
      chips.push({ key: 'include_archivadas', label: 'Ver archivadas' });
    }
    if (v.include_finalizadas) {
      chips.push({ key: 'include_finalizadas', label: 'Ver finalizadas' });
    }
    if (v.tipo && v.tipo !== '') {
      const typeLabels = { STD: 'Estándar', TC: 'Publicación (TC)', IT: 'IT' };
      chips.push({ key: 'tipo', label: `Tipo: ${typeLabels[v.tipo] || v.tipo}` });
    }
    if (v.tc_red_social_id) {
      const rs = catalog.tc_redes?.find(r => Number(r.id) === Number(v.tc_red_social_id));
      chips.push({ key: 'tc_red_social_id', label: `Red: ${rs?.nombre || v.tc_red_social_id}` });
    }
    if (v.tc_formato_id) {
      const f = catalog.tc_formatos?.find(f => Number(f.id) === Number(v.tc_formato_id));
      chips.push({ key: 'tc_formato_id', label: `Formato: ${f?.nombre || v.tc_formato_id}` });
    }
    if (v.tc_objetivo_negocio_id) {
      const o = catalog.tc_obj_negocio?.find(o => Number(o.id) === Number(v.tc_objetivo_negocio_id));
      chips.push({ key: 'tc_objetivo_negocio_id', label: `Obj. Neg: ${o?.nombre || v.tc_objetivo_negocio_id}` });
    }
    if (v.inamovible !== undefined && v.inamovible !== '') {
      chips.push({
        key: 'inamovible',
        label: v.inamovible === 'true' ? 'Inamovible' : 'Movible',
        icon: v.inamovible === 'true' ? <FiLock /> : <FiUnlock />
      });
    }
    if (v.tc_estado_publicacion_id) {
      const ep = catalog.tc_estados_pub?.find(e => Number(e.id) === Number(v.tc_estado_publicacion_id));
      let icon = null;
      if (Number(v.tc_estado_publicacion_id) === 2) icon = <FiCheckCircle />;
      if (Number(v.tc_estado_publicacion_id) === 3) icon = <FiClock />;

      chips.push({ key: 'tc_estado_publicacion_id', label: ep?.nombre || v.tc_estado_publicacion_id, icon });
    }
    if (v.solo_leads !== undefined && v.solo_leads !== '') {
      chips.push({
        key: 'solo_leads',
        label: v.solo_leads === 'true' ? 'Solo Leads' : 'Solo Clientes'
      });
    }

    return chips;
  }, [v, catalog]);
}

export function TareasActiveChips({ value, catalog, onChange }) {
  const v = value || {};
  const chips = useActiveChips(v, catalog);

  const upd = (patch) => onChange?.({ ...v, ...patch });

  const removeChip = (key) => {
    if (key === 'vencimiento') {
      upd({ vencimiento_from: '', vencimiento_to: '' });
    } else if (key === 'orden') {
      upd({ orden_by: 'prioridad', sort: 'desc' });
    } else {
      upd({ [key]: undefined });
    }
  }

  const clear = () => onChange?.({
    q: '',
    cliente_id: undefined,
    estado_id: undefined,
    estado_codigo: undefined,
    impacto_id: undefined,
    urgencia_id: undefined,
    vencimiento_from: '',
    vencimiento_to: '',
    orden_by: 'prioridad',
    sort: 'desc',
    solo_mias: v.solo_mias,
    include_archivadas: v.include_archivadas,
  })

  if (chips.length === 0) return null;

  return (
    <div className="activeFiltersChips">
      {chips.map(chip => (
        <div
          key={chip.key}
          className="chip"
          style={chip.color ? { '--chip-color': chip.color } : undefined}
        >
          <span className="chipLabel">{chip.label}</span>
          <button
            type="button"
            className="chipRemove"
            onClick={() => removeChip(chip.key)}
            title="Quitar filtro"
          >
            <FaTimes />
          </button>
        </div>
      ))}
      {chips.length > 1 && (
        <button type="button" className="clearAllChips" onClick={clear}>
          Limpiar todos
        </button>
      )}
    </div>
  );
}

export default function TareasFilters({ value, catalog, onChange, hideChips = false }) {
  const v = value || {}
  const [open, setOpen] = useState(false)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const rootRef = useRef(null), popRef = useRef(null)
  const searchInputRef = useRef(null);

  const activeChips = useActiveChips(v, catalog);
  const activeFiltersCount = activeChips.length;

  const upd = (patch) => {
    onChange?.({ ...v, ...patch });
  }

  const toggleSearch = () => {
    setIsSearchExpanded(!isSearchExpanded);
    if (!isSearchExpanded) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  const removeChip = (key) => {
    if (key === 'vencimiento') {
      upd({ vencimiento_from: '', vencimiento_to: '' });
    } else if (key === 'orden') {
      upd({ orden_by: 'prioridad', sort: 'desc' });
    } else {
      upd({ [key]: undefined });
    }
  }

  const clear = () => onChange?.({
    q: '',
    cliente_id: undefined,
    estado_id: undefined,
    estado_codigo: undefined,
    impacto_id: undefined,
    urgencia_id: undefined,
    vencimiento_from: '',
    vencimiento_to: '',
    orden_by: 'prioridad',
    sort: 'desc',
    solo_mias: v.solo_mias,
    include_archivadas: false,
    include_finalizadas: false,
    tipo: undefined,
    tc_red_social_id: undefined,
    tc_formato_id: undefined,
    tc_objetivo_negocio_id: undefined,
    tc_objetivo_marketing_id: undefined,
    inamovible: undefined,
    solo_leads: undefined
  })

  useEffect(() => {
    if (!open) return
    const onDown = (ev) => {
      if (rootRef.current && !rootRef.current.contains(ev.target)) {
        setOpen(false)
      }
    }
    const onKey = (ev) => { if (ev.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="TareasFiltersContainer" ref={rootRef}>
      <div className="FilterToolbar">
        {/* BUSCADOR PRINCIPAL */}
        <div className={`searchWrapper ${isSearchExpanded || v.q ? 'expanded' : 'collapsed'}`}>
          <button
            type="button"
            className="searchToggle"
            onClick={toggleSearch}
            title="Buscar"
          >
            <FaSearch className="searchIcon" />
          </button>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar..."
            value={v.q ?? ''}
            onChange={e => upd({ q: e.target.value })}
            onBlur={() => { if (!v.q) setIsSearchExpanded(false); }}
          />
          {(v.q) && (
            <button className="clearSearch" onClick={() => { upd({ q: '' }); setIsSearchExpanded(false); }}>
              <FaTimes />
            </button>
          )}
        </div>

        {/* TOGGLES RÁPIDOS */}
        <div className="quickToggles">
          <button
            type="button"
            className={`toggleBtn ${v.solo_mias ? 'active' : ''}`}
            onClick={() => upd({ solo_mias: !v.solo_mias })}
            title="Ver solo mis tareas"
          >
            <FaUser className="icon" />
            <span>Mis tareas</span>
          </button>

          <button
            type="button"
            className={`toggleBtn ${v.solo_leads === 'true' ? 'active' : ''}`}
            onClick={() => upd({ solo_leads: v.solo_leads === 'true' ? undefined : 'true', cliente_id: undefined })}
            title="Ver solo tareas de Leads"
          >
            <FiBriefcase className="icon" />
            <span>Leads</span>
          </button>
        </div>

        {/* BOTÓN FILTROS AVANZADOS */}
        <button
          className={`advancedBtn ${open ? 'open' : ''} ${activeFiltersCount > 0 ? 'hasFilters' : ''}`}
          onClick={() => setOpen(!open)}
        >
          <FaFilter />
          <span>Filtros</span>
          {activeFiltersCount > 0 && <span className="badge">{activeFiltersCount}</span>}
        </button>
      </div>

      {/* CHIPS DE FILTROS ACTIVOS */}
      {!hideChips && activeChips.length > 0 && (
        <div className="activeFiltersChips">
          {activeChips.map(chip => (
            <div
              key={chip.key}
              className="chip"
              style={chip.color ? { '--chip-color': chip.color } : undefined}
            >
              {chip.icon && <span className="chipIcon">{chip.icon}</span>}
              <span className="chipLabel">{chip.label}</span>
              <button
                type="button"
                className="chipRemove"
                onClick={() => removeChip(chip.key)}
                title="Quitar filtro"
              >
                <FaTimes />
              </button>
            </div>
          ))}
          {activeChips.length > 1 && (
            <button type="button" className="clearAllChips" onClick={clear}>
              Limpiar todos
            </button>
          )}
        </div>
      )}

      {/* POPOVER AVANZADO */}
      {open && (
        <div className="filterPopover" ref={popRef}>
          <div className="popHead">
            <strong>Filtros avanzados</strong>
            <button type="button" className="btnX" onClick={() => setOpen(false)}>×</button>
          </div>

          <div className="popBody">
            <div className="filterGrid">
              <div className="filterSection" style={{ gridColumn: 'span 2' }}>
                <h4 style={{ color: '#ffd54f', fontSize: '11px', textTransform: 'uppercase', marginBottom: '16px', opacity: 0.8, letterSpacing: '1px' }}>Filtros Generales</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <Field label="Cliente">
                    <select
                      value={v.cliente_id ?? ''}
                      onChange={e => upd({ cliente_id: e.target.value === '' ? undefined : Number(e.target.value), solo_leads: undefined })}
                    >
                      <option value="">Todos los clientes</option>
                      {catalog.clientes?.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </Field>

                  <Field label="Relación">
                    <select
                      value={v.solo_leads ?? ''}
                      onChange={e => upd({ solo_leads: e.target.value === '' ? undefined : e.target.value, cliente_id: undefined })}
                    >
                      <option value="">Todos</option>
                      <option value="false">Solo Clientes</option>
                      <option value="true">Solo Leads</option>
                    </select>
                  </Field>

                  <Field label="Estado">
                    <select
                      value={v.estado_id ?? ''}
                      onChange={e => upd({ estado_id: e.target.value === '' ? undefined : Number(e.target.value) })}
                    >
                      <option value="">Pendientes y en curso</option>
                      {catalog.estados?.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                  </Field>

                  <Field label="Tipo de Tarea">
                    <select
                      value={v.tipo ?? ''}
                      onChange={e => upd({ tipo: e.target.value === '' ? undefined : e.target.value })}
                    >
                      <option value="">Todos los tipos</option>
                      <option value="STD">Estándar</option>
                      <option value="TC">Publicación (TC)</option>
                      <option value="IT">IT</option>
                    </select>
                  </Field>
                </div>
              </div>

              {v.tipo === 'TC' && (
                <div className="filterSection tcSection" style={{ gridColumn: 'span 2', background: 'rgba(255, 171, 0, 0.05)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255, 171, 0, 0.1)' }}>
                  <h4 style={{ color: '#ffd54f', fontSize: '11px', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px' }}>Contenido / Redes</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <Field label="Red Social">
                      <select
                        value={v.tc_red_social_id ?? ''}
                        onChange={e => upd({ tc_red_social_id: e.target.value === '' ? undefined : Number(e.target.value) })}
                      >
                        <option value="">Todas las redes</option>
                        {catalog.tc_redes?.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                      </select>
                    </Field>
                    <Field label="Formato">
                      <select
                        value={v.tc_formato_id ?? ''}
                        onChange={e => upd({ tc_formato_id: e.target.value === '' ? undefined : Number(e.target.value) })}
                      >
                        <option value="">Todos los formatos</option>
                        {catalog.tc_formatos?.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                      </select>
                    </Field>
                    <Field label="Obj. Negocio">
                      <select
                        value={v.tc_objetivo_negocio_id ?? ''}
                        onChange={e => upd({ tc_objetivo_negocio_id: e.target.value === '' ? undefined : Number(e.target.value) })}
                      >
                        <option value="">Todos los objetivos</option>
                        {catalog.tc_obj_negocio?.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                      </select>
                    </Field>
                    <Field label="Inamovible">
                      <select
                        value={v.inamovible ?? ''}
                        onChange={e => upd({ inamovible: e.target.value === '' ? undefined : e.target.value })}
                      >
                        <option value="">Todos</option>
                        <option value="true">Sí (Inamovible)</option>
                        <option value="false">No (Movible)</option>
                      </select>
                    </Field>
                    <Field label="Estado Publicación">
                      <select
                        value={v.tc_estado_publicacion_id ?? ''}
                        onChange={e => upd({ tc_estado_publicacion_id: e.target.value === '' ? undefined : Number(e.target.value) })}
                      >
                        <option value="">Cualquier estado</option>
                        {catalog.tc_estados_pub?.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>
              )}


              <div className="dateRange">
                <span className="label">Vencimiento</span>
                <div className="inputs">
                  <DateInput
                    value={v.vencimiento_from || ''}
                    onChange={e => upd({ vencimiento_from: e.target.value })}
                  />
                  <span className="sep">al</span>
                  <DateInput
                    value={v.vencimiento_to || ''}
                    onChange={e => upd({ vencimiento_to: e.target.value })}
                  />
                </div>
              </div>

              <Field label="Ordenar por">
                <div className="orderRow">
                  <select
                    value={v.orden_by ?? 'prioridad'}
                    onChange={e => upd({ orden_by: e.target.value })}
                  >
                    <option value="prioridad">Prioridad</option>
                    <option value="vencimiento">Vencimiento</option>
                    <option value="fecha_inicio">Inicio</option>
                    <option value="created_at">Creación</option>
                    <option value="updated_at">Actualización</option>
                    <option value="cliente">Cliente</option>
                    <option value="titulo">Título</option>
                  </select>
                  <select
                    className="small"
                    value={v.sort ?? 'desc'}
                    onChange={e => upd({ sort: e.target.value })}
                  >
                    <option value="desc">DESC</option>
                    <option value="asc">ASC</option>
                  </select>
                </div>
              </Field>

              <div className="popCheckboxes" style={{ gridColumn: 'span 2' }}>
                <label className="toggleCheck">
                  <input
                    type="checkbox"
                    checked={!!v.include_archivadas}
                    onChange={e => upd({ include_archivadas: e.target.checked })}
                  />
                  <div className="checkmark" />
                  <span className="label">Mostrar archivadas</span>
                </label>
              </div>
            </div>
          </div>

          <div className="popFooter">
            <button type="button" className="btnReset" onClick={clear}>Restablecer</button>
            <button type="button" className="btnApply" onClick={() => setOpen(false)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  )
}
