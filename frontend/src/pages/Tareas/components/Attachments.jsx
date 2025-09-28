// /src/pages/Tareas/components/Attachments.jsx

import { useRef, useState } from 'react';

export default function Attachments({ items = [], onAdd, onRemove }) {
  const [adding, setAdding] = useState(false);
  const nameRef = useRef(null);
  const urlRef = useRef(null);

  const handleAdd = async (e) => {
    e.preventDefault();
    const nombre = nameRef.current?.value ?? '';
    const drive_url = urlRef.current?.value ?? '';
    if (!nombre.trim() || !drive_url.trim()) return;
    await onAdd?.({ nombre: nombre.trim(), drive_url: drive_url.trim() });
    nameRef.current.value = '';
    urlRef.current.value = '';
    setAdding(false);
  };

  return (
    <div>
      <ul className="attachments">
        {(items ?? []).map(a => (
          <li key={a.id}>
            <a href={a.drive_url ?? '#'} target="_blank" rel="noreferrer">{a.nombre}</a>
            <span className="muted">{a.mime || ''}</span>
            {onRemove && <button className="btnLink danger" onClick={() => onRemove(a.id)}>Eliminar</button>}
          </li>
        ))}
        {!items?.length && <div className="muted">Sin adjuntos</div>}
      </ul>

      {!adding ? (
        <button className="btnLink" type="button" onClick={() => setAdding(true)}>+ Agregar adjunto</button>
      ) : (
        <form className="inlineForm" onSubmit={handleAdd}>
          <input ref={nameRef} type="text" placeholder="Nombre archivo" />
          <input ref={urlRef} type="url" placeholder="URL (Drive u otra)" />
          <button className="btnPrimary" type="submit">Guardar</button>
          <button className="btnGhost" type="button" onClick={() => setAdding(false)}>Cancelar</button>
        </form>
      )}
    </div>
  );
}
