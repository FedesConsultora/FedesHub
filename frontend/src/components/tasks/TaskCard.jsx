// /frontend/src/components/tasks/TaskCard.jsx
import { useNavigate } from 'react-router-dom'
import AvatarStack from '../common/AvatarStack'

export default function TaskCard({ t, onPointerDown, onOpenTask}) {
const open = () => {
  onOpenTask(t.id);
};


  const dueTxt = t.due
    ? new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit' })
        .format(new Date(t.due))
    : '—'

  return (
    <article
      className="fh-k-task"
      onPointerDown={onPointerDown}
      onClick={open}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && open()}
      aria-label={`Abrir tarea #${t.id}: ${t.title}`}
    >
      <div className="fh-k-row">
        <div className="fh-k-client" title={t.client?.name ?? '—'}>
          {t.client?.name ?? '—'}
        </div>
        <div className="fh-k-date" title="Vencimiento">{dueTxt}</div>
      </div>

      <div className="fh-k-title" title={t.title}>{t.title}</div>

      <div className="fh-k-people">
        <div className="fh-k-role">
          <span className="fh-k-roleLabel">Resp.</span>
          <AvatarStack people={t.responsables || []} titlePrefix="Responsable: " />
        </div>
        <div className="fh-k-role">
          <span className="fh-k-roleLabel">Colab.</span>
          <AvatarStack people={t.colaboradores || []} titlePrefix="Colaborador: " />
        </div>
      </div>
    </article>
  )
}