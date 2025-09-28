// /src/pages/Tareas/components/Checklist.jsx

import { useRef, useState } from 'react';

export default function Checklist({ items = [], onToggle, onAdd }) {
  const [adding, setAdding] = useState(false);
  const inputRef = useRef(null);

  const handleAdd = async (e) => {
    e.preventDefault();
    const titulo = inputRef.current?.value ?? '';
    if (!titulo.trim()) return;
    await onAdd?.(titulo.trim());
    inputRef.current.value = '';
    setAdding(false);
  };

  return (
    <div>
      <ul className="checklist">
        {items.map(it => (
          <li key={it.id}>
            <label>
              <input type="checkbox" checked={!!it.is_done} onChange={() => onToggle?.(it)} />
              <span className={it.is_done ? 'done' : ''}>{it.titulo}</span>
            </label>
          </li>
        ))}
        {!items.length && <div className="muted">Sin ítems</div>}
      </ul>

      {!adding ? (
        <button type="button" className="btnLink" onClick={() => setAdding(true)}>+ Agregar ítem</button>
      ) : (
        <form onSubmit={handleAdd} className="inlineForm">
          <input ref={inputRef} type="text" placeholder="Nuevo ítem…" />
          <button className="btnPrimary" type="submit">Agregar</button>
          <button type="button" className="btnGhost" onClick={() => setAdding(false)}>Cancelar</button>
        </form>
      )}
    </div>
  );
}
