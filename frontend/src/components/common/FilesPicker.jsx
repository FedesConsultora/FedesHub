import React, { useEffect, useRef, useState } from 'react'
import '../../pages/Tareas/task-detail.scss'

export default function FilesPicker({
  files = [],
  onChange,
  onPaste,            // opcional: handler local (no global)
  listenGlobal = false, // ⬅️ por defecto NO escucha window.paste
  showPreviews = false,
  maxTotalMB = 25
}){
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
  const removeAt = (idx) => onChange?.(files.filter((_,i)=>i!==idx))

  // ⬇️ Sólo engancha "window.paste" si lo pedís explícitamente
  useEffect(() => {
    if (!listenGlobal || !onPaste) return
    const handler = (e) => onPaste(e)
    window.addEventListener('paste', handler)
    return () => window.removeEventListener('paste', handler)
  }, [listenGlobal, onPaste])

  return (
    <div className={`uploader ${over?'is-over':''}`}
      onDragOver={(e)=>{ e.preventDefault(); setOver(true) }}
      onDragLeave={()=>setOver(false)}
      onDrop={(e)=>{ e.preventDefault(); setOver(false); add(e.dataTransfer.files) }}
    >
      <div className="pickRow">
        <button className="btn" type="button" onClick={()=>inputRef.current?.click()}>Adjuntar archivos</button>
        <input ref={inputRef} type="file" multiple hidden onChange={(e)=> add(e.target.files)} />
        <span className="hint">Soltá aquí o elegí archivos. (Imágenes, PDF, docs…)</span>
        {!!files.length && <span className="muted" style={{marginLeft:'auto'}}>{bytesToMB(sizeOf(files)).toFixed(1)} MB totales</span>}
      </div>
      {!!files.length && (
        <div className="list">
          {files.map((f, i) => {
            const isImg = f.type?.startsWith('image/')
            const url = isImg && showPreviews ? URL.createObjectURL(f) : null
            return (
              <div className="fileItem" key={`${f.name}-${i}`}>
                {isImg && showPreviews
                  ? <img src={url} alt="" style={{height:36, width:36, objectFit:'cover', borderRadius:6, marginRight:6}} />
                  : <span className="material-symbols-outlined" aria-hidden>description</span>}
                <span className="name">{f.name}</span>
                <span className="muted">{niceSize(f.size)}</span>
                <button className="rm" onClick={()=>removeAt(i)} title="Quitar">✕</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const sizeOf = (arr=[]) => arr.reduce((s,f)=>s+(f.size||0),0)
const bytesToMB = (n)=> n/(1024**2)
const niceSize = (n=0)=> n<1024?`${n} B`: n<1024**2?`${(n/1024).toFixed(1)} KB`: n<1024**3?`${(n/1024**2).toFixed(1)} MB`:`${(n/1024**3).toFixed(1)} GB`
const dedupe = (arr=[]) => {
  const seen = new Set()
  return arr.filter(f => { const k = `${f.name}-${f.size}-${f.lastModified}`; if (seen.has(k)) return false; seen.add(k); return true })
}
