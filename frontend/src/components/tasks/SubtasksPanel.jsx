import React, { useMemo, useState } from 'react'
import useSubtasks from '../../pages/Tareas/hooks/useSubtasks'
import { useToast } from '../toast/ToastProvider.jsx'
import GlobalLoader from '../loader/GlobalLoader.jsx'
import { FiPlus, FiExternalLink } from 'react-icons/fi'

export default function SubtasksPanel({ parentId, defaultClienteId = null, catalog = {}, onNewSubtask, onNavigate }) {
  const { list, loading, error } = useSubtasks(parentId)

  return (
    <div className="card" style={{ position: 'relative', minHeight: '120px', border: 'none', boxShadow: 'none' }}>
      <div className="cardHeader" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
        <div className="title" style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.8 }}>Subtareas</div>
        <button
          onClick={onNewSubtask}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '4px 8px',
            fontWeight: '600'
          }}
        >
          <FiPlus /> Nueva Subtarea
        </button>
      </div>

      {error && <div className="error" style={{ margin: '12px' }}>{error}</div>}

      {loading ? (
        <div style={{ padding: '40px 0' }}><GlobalLoader isLoading={loading} size={60} /></div>
      ) : (
        (list || []).length === 0
          ? <div className="empty" style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.9rem' }}>
            No hay subtareas aún
          </div>
          : <div className="col" style={{ padding: '12px 0', gap: '8px' }}>
            {(list || []).map(t => (
              <div
                key={t.id}
                className="fh-border subtask-item"
                onClick={() => onNavigate && onNavigate(t.id)}
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                  e.currentTarget.style.transform = 'translateX(4px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'
                  e.currentTarget.style.transform = 'translateX(0)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{t.titulo}</div>
                  <FiExternalLink style={{ opacity: 0.4, fontSize: '0.9rem' }} />
                </div>
                <div className="metaRow" style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', opacity: 0.6 }}>
                  {t.cliente_nombre && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: t.cliente_color || '#3ea0ff' }}></span>
                      {t.cliente_nombre}
                    </span>
                  )}
                  {t.estado_nombre && <span>{t.estado_nombre}</span>}
                  {t.progreso_pct !== undefined && <span>{t.progreso_pct}%</span>}
                </div>
              </div>
            ))}
          </div>
      )}
    </div>
  )
}
