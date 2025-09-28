// /src/pages/Tareas/components/EstadoBar.jsx

// Barra superior estilo Odoo con los estados (usa estado_id de la tarea).
import './estado-bar.scss';

export default function EstadoBar({ estados = [], currentId, onChange }) {
  return (
    <div className="estadoBar card">
      {estados.map((e, idx) => {
        const active = e.id === currentId;
        return (
          <button
            key={e.id}
            className={`estadoBar__step ${active ? 'is-active' : ''}`}
            onClick={() => onChange?.(e.id)}
            title={e.descripcion || e.nombre}
            type="button"
          >
            <span className="estadoBar__dot" />
            <span className="estadoBar__label">{e.nombre}</span>
            {idx < estados.length - 1 && <span className="estadoBar__line" />}
          </button>
        );
      })}
    </div>
  );
}
