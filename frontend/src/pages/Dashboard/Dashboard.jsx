import AppGrid from '../../components/AppGrid/AppGrid.jsx'

/** Catálogo de apps (módulos) – código visible y path destino */
const APPS = [
  { code: 'feders',       name: 'Feders',        path: '/feders',       emoji: '👥' },
  { code: 'cargos',       name: 'Cargos',        path: '/cargos',       emoji: '🧭' },
  { code: 'asistencia',   name: 'Asistencia',    path: '/asistencia',   emoji: '🟢', disabled: true },
  { code: 'ausencias',    name: 'Ausencias',     path: '/ausencias',    emoji: '🏝️', disabled: true },
  { code: 'celulas',      name: 'Células',       path: '/celulas',      emoji: '🧩', disabled: true },
  { code: 'clientes',     name: 'Clientes',      path: '/clientes',     emoji: '🏢', disabled: true },
  { code: 'tareas',       name: 'Tareas',        path: '/tareas',       emoji: '✅', disabled: true },
  { code: 'calendario',   name: 'Calendario',    path: '/calendario',   emoji: '📆', disabled: true },
  { code: 'notificaciones', name: 'Notificaciones', path: '/notificaciones', emoji: '🔔', disabled: true },
]

export default function Dashboard() {
  return <AppGrid apps={APPS} />
}
