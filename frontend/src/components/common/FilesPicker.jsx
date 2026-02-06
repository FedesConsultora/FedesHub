import React, { useEffect, useRef, useState } from 'react'
import { MdOutlineUploadFile, MdPlayArrow } from "react-icons/md";
import { getFileType, getFileIcon, formatFileSize } from '../tasks/comments/fileHelpers';

import '../../pages/Tareas/task-detail.scss'

export default function FilesPicker({
  files = [],
  onChange,
  onPaste,            // opcional: handler local (no global)
  listenGlobal = false, // ⬅️ por defecto NO escucha window.paste
  showPreviews = false,
  maxTotalMB = 25
}) {
  const inputRef = useRef(null)
  const [over, setOver] = useState(false)

  const add = (list) => {
    const arr = Array.from(list || [])
    if (!arr.length) return
    const next = dedupe([...files, ...arr])
    if (bytesToMB(sizeOf(next)) > maxTotalMB) {
      alert(`Límite total ${maxTotalMB}MB. Quitá algo o subí menos archivos.`)
      return
    }
    onChange?.(next)
  }
  const removeAt = (idx) => onChange?.(files.filter((_, i) => i !== idx))

  // ⬇️ Sólo engancha "window.paste" si lo pedís explícitamente
  useEffect(() => {
    if (!listenGlobal || !onPaste) return
    const handler = (e) => onPaste(e)
    window.addEventListener('paste', handler)
    return () => window.removeEventListener('paste', handler)
  }, [listenGlobal, onPaste])

  return (
    <div className={`uploader ${over ? 'is-over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files) }}
    >
      <div className="pickRow">
        <MdOutlineUploadFile size={36} color={'#1A73E8'} onClick={() => inputRef.current?.click()} style={{ cursor: 'pointer' }} />
        <input ref={inputRef} type="file" multiple hidden onChange={(e) => add(e.target.files)} />
        <span className="hint">Soltá aquí o elegí archivos. (Imágenes, PDF, docs…)</span>
        {!!files.length && <span className="muted" style={{ marginLeft: 'auto' }}>{bytesToMB(sizeOf(files)).toFixed(1)} MB totales</span>}
      </div>
      {!!files.length && (
        <div className="list">
          {files.map((f, i) => {
            const type = getFileType(f)
            const isImg = type === 'image'
            const isVideo = type === 'video'
            const url = (isImg || isVideo) && showPreviews ? URL.createObjectURL(f) : null
            const { Icon, color } = getFileIcon(type)

            return (
              <div className="fileItem" key={`${f.name}-${i}`}>
                <button className="rm" onClick={() => removeAt(i)} title="Quitar">✕</button>

                {/* Image preview */}
                {isImg && showPreviews && url ? (
                  <img
                    src={url}
                    alt=""
                    style={{
                      height: 40,
                      width: 40,
                      objectFit: 'cover',
                      borderRadius: 6,
                      marginRight: 8
                    }}
                  />
                ) : isVideo && showPreviews && url ? (
                  /* Video preview with play icon */
                  <div style={{
                    position: 'relative',
                    height: 40,
                    width: 40,
                    marginRight: 8,
                    borderRadius: 6,
                    overflow: 'hidden',
                    background: '#0f172a'
                  }}>
                    <video
                      src={url}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        opacity: 0.7
                      }}
                      muted
                    />
                    <MdPlayArrow
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: 'white',
                        fontSize: '1.5rem',
                        pointerEvents: 'none'
                      }}
                    />
                  </div>
                ) : (
                  /* File type icon */
                  <Icon
                    style={{
                      fontSize: '1.5rem',
                      color,
                      marginRight: 8,
                      flexShrink: 0
                    }}
                  />
                )}

                <span className="name">{f.name}</span>
                <span className="muted">{formatFileSize(f.size)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const sizeOf = (arr = []) => arr.reduce((s, f) => s + (f.size || 0), 0)
const bytesToMB = (n) => n / (1024 ** 2)
const dedupe = (arr = []) => {
  const seen = new Set()
  return arr.filter(f => { const k = `${f.name}-${f.size}-${f.lastModified}`; if (seen.has(k)) return false; seen.add(k); return true })
}
