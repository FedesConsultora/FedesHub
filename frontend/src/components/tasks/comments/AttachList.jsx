import React from 'react'
import { iconFor } from './icons'

export default function AttachList({ items=[] }){
  return (
    <div className="attachList">
      {items.map(a => {
        const isImg = a.mime?.startsWith('image/') && !!a.drive_url
        const Icon = iconFor(a.mime || '', a.nombre || '')
        return (
          <a
            key={a.id || a.nombre}
            href={a.drive_url || '#'}
            target={a.drive_url ? '_blank' : '_self'}
            rel="noreferrer"
            className="attachItem"
            title={a.nombre}
          >
            {isImg
              ? <img alt={a.nombre} src={a.drive_url} loading="lazy" referrerPolicy="no-referrer" />
              : <Icon className="ico" aria-hidden="true" />
            }
            <span className="name">{a.nombre}</span>
            <span className="muted">{a.mime || ''}</span>
          </a>
        )
      })}
    </div>
  )
}
