import React from 'react'
import { iconFor } from './icons'

export default function AttachList({ items = [] }) {
  return (
    <div className="attachList">
      {items.map(a => {
        const isImg = a.mime?.startsWith('image/') && (!!a.drive_url || !!a.drive_file_id)
        const Icon = iconFor(a.mime || '', a.nombre || '')

        const getFileUrl = (file) => {
          if (!file) return null
          if (file.drive_file_id) return `/api/tareas/drive/image/${file.drive_file_id}`
          if (file.drive_url?.includes('drive.google.com')) {
            const match = file.drive_url.match(/\/file\/d\/([^\/]+)/)
            if (match && match[1]) return `/api/tareas/drive/image/${match[1]}`
          }
          return file.drive_url || null
        }

        const url = getFileUrl(a)

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
              ? <img alt={a.nombre} src={url} loading="lazy" referrerPolicy="no-referrer" />
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
