import React, { useState } from 'react'
import { MdPlayArrow } from 'react-icons/md'
import ImageFullscreen from '../../common/ImageFullscreen'
import { getFileType, getProxyUrl, getFileIcon } from './fileHelpers'

export default function AttachList({ items = [] }) {
  const [fullscreen, setFullscreen] = useState(null)

  return (
    <div className="attachList">
      {items.map(a => {
        const url = getProxyUrl(a)
        const type = getFileType(a)
        const { Icon, color } = getFileIcon(type)

        return (
          <div key={a.id || a.nombre} className="attachItem">
            {/* Image preview */}
            {type === 'image' && url ? (
              <img
                alt={a.nombre}
                src={url}
                loading="lazy"
                onClick={() => setFullscreen({ url, name: a.nombre, isVideo: false })}
                style={{ cursor: 'pointer' }}
              />
            ) : type === 'video' && url ? (
              /* Video preview with play icon */
              <div className="video-thumb" onClick={() => setFullscreen({ url, name: a.nombre, isVideo: true })}>
                <video src={url} muted preload="metadata" />
                <MdPlayArrow className="play-icon" />
              </div>
            ) : (
              /* File type icon with link */
              <a href={a.drive_url || '#'} target="_blank" rel="noreferrer">
                <Icon className="ico" aria-hidden="true" style={{ color }} />
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
