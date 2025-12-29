import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import PersonTag from '../../components/PersonTag.jsx'
import Avatar from '../../components/Avatar.jsx'
import { FiEdit2, FiPlus } from 'react-icons/fi'
import { MdOutlineModeEditOutline } from "react-icons/md";

import { useAuthCtx } from '../../context/AuthContext'
import CelulaFormModal from '../../components/celulas/CelulaFormModal.jsx'
import './CelulasGrid.scss'

function CelulaCard({ c, onEdit, canUpdate }) {
  const navigate = useNavigate()
  const handleClick = (e) => {
    // Si hizo clic en un botón interno (como editar), no navegamos
    if (e.target.closest('button')) return
    navigate(`/feders/celulas/${c.id}`)
  }

  return (
    <section className="celCard" onClick={handleClick} style={{ cursor: 'pointer' }}>
      <header className="title">
        <Avatar src={c.avatar_url} name={c.nombre} size={36} />
        <h4>{c.nombre}</h4>
        <span className={`chip ${c.estado_codigo}`}>{c.estado_codigo}</span>
        {canUpdate && (
          <button style={{ cursor: 'pointer', border: 'none', background: 'transparent' }} onClick={() => onEdit(c)} title="Editar célula">
            <MdOutlineModeEditOutline size={24} />
          </button>
        )}
      </header>

      <div className="miembros">
        {c.miembros.length === 0 && <div className="empty">Sin miembros activos</div>}
        {c.miembros.map(m => (
          <PersonTag
            key={m.feder_id}
            p={{ nombre: m.nombre, apellido: m.apellido, avatar_url: m.avatar_url }}
            subtitle={m.cargo_nombre || (m.es_principal ? 'Miembro (principal)' : 'Miembro')}
          />
        ))}
      </div>
    </section>
  )
}

export default function CelulasGrid({ items = [], onRefresh }) {
  const navigate = useNavigate()
  const { hasPerm } = useAuthCtx() || {}
  const canUpdate = hasPerm('celulas', 'update')
  const [modalOpen, setModalOpen] = useState(false)

  const handleEdit = (c) => {
    navigate(`/feders/celulas/${c.id}?edit=true`)
  }

  const handleNew = () => {
    setModalOpen(true)
  }

  return (
    <section className="fhCelulas">
      <header className="gridHeader">
        <h3>Células</h3>
        {canUpdate && (
          <button className="newBtn" onClick={handleNew}>
            <FiPlus /> Nueva Célula
          </button>
        )}
      </header>

      <div className="grid">
        {items.map(c => (
          <CelulaCard
            key={c.id}
            c={c}
            onEdit={handleEdit}
            canUpdate={canUpdate}
          />
        ))}
      </div>

      <CelulaFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={onRefresh}
      />
    </section>
  )
}
