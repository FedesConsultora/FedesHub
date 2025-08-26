import AppGrid from '../../components/AppGrid/AppGrid'

const APPS = [
  { code:'feders',  name:'Feders',        emoji:'👤', path:'/feders' },
  { code:'cargos',  name:'Cargos',        emoji:'🧭', path:'/cargos' },
  { code:'tareas',  name:'Tareas',        emoji:'✅', path:'/tareas',  disabled:true },
  { code:'clientes',name:'Clientes',      emoji:'🤝', path:'/clientes',disabled:true },
  { code:'auth',    name:'Admin (Auth)',  emoji:'🛡️', path:'/admin/usuarios' },
]

export default function Dashboard() {
  document.title = 'FedesHub — Inicio'
  return (
    <section className="card">
      <h2 style={{marginBottom:8}}>Inicio</h2>
      <AppGrid apps={APPS} />
    </section>
  )
}
