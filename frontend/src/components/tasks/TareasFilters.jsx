// frontend/src/components/tasks/TareasFilters.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { FaRegCalendarAlt, FaFilter, FaSearch, FaTimes, FaUser, FaArchive } from 'react-icons/fa'
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

export default function TareasFilters({ value, catalog, onChange }) {
  const v = value || {}
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null), popRef = useRef(null)

  // Generar lista de filtros activos para mostrar como chips
  const activeChips = useMemo(() => {
    const chips = [];

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

    return chips;
  }, [v, catalog]);

  // Calcular cuántos filtros avanzados hay activos
  const activeFiltersCount = activeChips.length;

  const upd = (patch) => {
    onChange?.({ ...v, ...patch });
  }

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
    impacto_id: undefined,
    urgencia_id: undefined,
    vencimiento_from: '',
    vencimiento_to: '',
    orden_by: 'prioridad',
    sort: 'desc',
    solo_mias: v.solo_mias,
    include_archivadas: v.include_archivadas,
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
        <div className="searchWrapper">
          <FaSearch className="searchIcon" />
          <input
            type="text"
            placeholder="Buscar por título, ID o cliente..."
            value={v.q ?? ''}
            onChange={e => upd({ q: e.target.value })}
          />
          {v.q && (
            <button className="clearSearch" onClick={() => upd({ q: '' })}>
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
            className={`toggleBtn ${v.include_archivadas ? 'active' : ''}`}
            onClick={() => upd({ include_archivadas: !v.include_archivadas })}
            title="Incluir tareas archivadas"
          >
            <FaArchive className="icon" />
            <span>Archivadas</span>
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
      {activeChips.length > 0 && (
        <div className="activeFiltersChips">
          {activeChips.map(chip => (
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
            <strong>Filtros Avanzados</strong>
            <button type="button" className="btnX" onClick={() => setOpen(false)}>×</button>
          </div>

          <div className="popBody">
            <div className="filterGrid">
              <Field label="Cliente">
                <select
                  value={v.cliente_id ?? ''}
                  onChange={e => upd({ cliente_id: e.target.value === '' ? undefined : Number(e.target.value) })}
                >
                  <option value="">Todos los clientes</option>
                  {catalog.clientes?.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </Field>

              <Field label="Estado">
                <select
                  value={v.estado_id ?? ''}
                  onChange={e => upd({ estado_id: e.target.value === '' ? undefined : Number(e.target.value) })}
                >
                  <option value="">Cualquier estado</option>
                  {catalog.estados?.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </Field>

              <Field label="Impacto">
                <select
                  value={v.impacto_id ?? ''}
                  onChange={e => upd({ impacto_id: e.target.value === '' ? undefined : Number(e.target.value) })}
                >
                  <option value="">Cualquiera</option>
                  {catalog.impactos?.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                </select>
              </Field>

              <Field label="Urgencia">
                <select
                  value={v.urgencia_id ?? ''}
                  onChange={e => upd({ urgencia_id: e.target.value === '' ? undefined : Number(e.target.value) })}
                >
                  <option value="">Cualquiera</option>
                  {catalog.urgencias?.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
              </Field>

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
