// /src/pages/Tareas/components/Comments.jsx

import { useRef, useState } from 'react';

export default function Comments({ items = [], loading = false, onAdd }) {
  const formRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const contenido = (fd.get('contenido') || '').toString();
    if (!contenido.trim()) return;
    setSubmitting(true);
    try {
      await onAdd?.({ contenido });
      formRef.current?.reset();
    } finally { setSubmitting(false); }
  };

  return (
    <div className="comments">
      {(items ?? []).map(c => (
        <div key={c.id} className="comment">
          <div className="meta">
            <b>#{c.id}</b> · {new Date(c.created_at).toLocaleString()}
          </div>
          <div className="content">{c.contenido}</div>
          {c.adjuntos?.length ? (
            <ul className="attachments small">
              {c.adjuntos.map(a => (
                <li key={a.id}>
                  <a href={a.drive_url ?? '#'} target="_blank" rel="noreferrer">{a.nombre}</a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
      {!loading && !items?.length && <div className="muted">Sin comentarios</div>}

      <form ref={formRef} className="addComment" onSubmit={handleSubmit}>
        <textarea
          name="contenido"
          placeholder="Escribir un mensaje… (podés mencionar con @123)"
          rows={3}
        />
        <div className="actions">
          <button type="submit" className="btnPrimary" disabled={submitting}>
            {submitting ? 'Enviando…' : 'Enviar mensaje'}
          </button>
        </div>
      </form>
    </div>
  );
}
