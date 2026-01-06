import React, { useState } from 'react'
import { iconFor } from './icons'
import ImageFullscreen from '../../common/ImageFullscreen'
import { MdPlayArrow } from 'react-icons/md'

export default function AttachList({ items = [] }) {
  const [fullscreen, setFullscreen] = useState(null)

  const isImg = (f) => {
    if (!f) return false
    const mime = f.mime || f.mimetype || ''
    const name = (f.nombre || f.name || '').toLowerCase()
    return mime.startsWith('image/') || name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
  }

  const isVideo = (f) => {
    if (!f) return false
    const mime = f.mime || f.mimetype || ''
    const name = (f.nombre || f.name || '').toLowerCase()
    return mime.startsWith('video/') || name.match(/\.(mp4|webm|mov|avi)$/i)
  }

  const getFileUrl = (file) => {
    if (!file) return null

    // 1. Si tiene drive_file_id (prioridad máxima para el proxy)
    if (file.drive_file_id) {
      return `/api/tareas/drive/image/${file.drive_file_id}`
    }

    // 2. Fallback a URLs de Google Drive o locales
    const url = file.drive_url || file.url || null
    if (!url) return null

    if (url.startsWith('/uploads') || url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
      return url
    }

    if (url.includes('drive.google.com')) {
      const match = url.match(/\/file\/d\/([^\/]+)/)
      if (match && match[1]) return `/api/tareas/drive/image/${match[1]}`
      const matchId = url.match(/[?&]id=([^&]+)/)
      if (matchId && matchId[1]) return `/api/tareas/drive/image/${matchId[1]}`
    }

    return url
  }

  return (
    <div className="attachList">
      {items.map(a => {
        const url = getFileUrl(a)
        const image = isImg(a)
        const video = isVideo(a)
        const Icon = iconFor(a.mime || '', a.nombre || '')

        return (
          <div key={a.id || a.nombre} className="attachItem">
            {image && url ? (
              <img
                alt={a.nombre}
                src={url}
                loading="lazy"
                onClick={() => setFullscreen({ url, name: a.nombre, isVideo: false })}
                style={{ cursor: 'pointer' }}
              />
            ) : video && url ? (
              <div className="video-thumb" onClick={() => setFullscreen({ url, name: a.nombre, isVideo: true })}>
                <video src={url} muted preload="metadata" />
                <MdPlayArrow className="play-icon" />
              </div>
            ) : (
              <a href={a.drive_url || '#'} target="_blank" rel="noreferrer">
                <Icon className="ico" aria-hidden="true" />
              </a>
            )}
            <span className="name" title={a.nombre}>{a.nombre}</span>
          </div>
        )
      })}

      {fullscreen && (
        <ImageFullscreen
          src={fullscreen.url}
          alt={fullscreen.name}
          isVideo={fullscreen.isVideo}
          onClose={() => setFullscreen(null)}
        />
      )}
    </div>
  )
}
