import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiX, FiDownload, FiShare2, FiExternalLink, FiCopy, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { useToast } from '../toast/ToastProvider' // asegúrate de esta ruta
import './Lightbox.scss'

export function useLightbox({ onForward } = {}) {
  const [state, set] = useState({ open: false, idx: 0, items: [] })
  const toast = useToast()

  const open = useCallback((items = [], idx = 0) => {
    if (!Array.isArray(items) || items.length === 0) return
    set({ open: true, idx: Math.max(0, Math.min(idx, items.length - 1)), items })
  }, [])

  const close = useCallback(() => set(s => ({ ...s, open: false })), [])
  const next  = useCallback(() => set(s => ({ ...s, idx: (s.idx + 1) % s.items.length })), [])
  const prev  = useCallback(() => set(s => ({ ...s, idx: (s.idx - 1 + s.items.length) % s.items.length })), [])

  useEffect(() => {
    if (!state.open) return
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft')  prev()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [state.open, close, next, prev])

  const isImg = useCallback((it) =>
    (it?.mime || '').startsWith('image/') || /\.(png|jpe?g|gif|webp|avif)$/i.test(it?.url || '')
  , [])

  // Copia la imagen en el portapapeles (preferentemente como PNG para compatibilidad al pegar)
  async function copyImageBlob(url) {
    const toPngBlob = async (blob) => {
      try {
        if (blob.type === 'image/png') return blob
        const bmp = await createImageBitmap(blob)
        const canvas = document.createElement('canvas')
        canvas.width = bmp.width; canvas.height = bmp.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(bmp, 0, 0)
        return await new Promise(res => canvas.toBlob(res, 'image/png'))
      } catch { return blob }
    }

    // 1) fetch → blob → PNG → clipboard.write
    try {
      const resp = await fetch(url, { mode: 'cors', cache: 'no-cache' })
      let blob = await resp.blob()
      if (!/^image\//.test(blob.type)) return false
      blob = (await toPngBlob(blob)) || blob
      if (navigator.clipboard?.write && window.ClipboardItem) {
        await navigator.clipboard.write([ new window.ClipboardItem({ [blob.type]: blob }) ])
        try {
          if (navigator.clipboard.read) {
            const items = await navigator.clipboard.read()
            if (items.some(i => i.types?.some(t => t.startsWith('image/')))) return true
          }
        } catch {}
        return true
      }
    } catch {}

    // 2) Fallback canvas + CORS anónimo
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = url
      await img.decode()
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0)
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
      if (blob && navigator.clipboard?.write && window.ClipboardItem) {
        await navigator.clipboard.write([ new window.ClipboardItem({ [blob.type]: blob }) ])
        return true
      }
    } catch {}

    return false
  }

  const Lightbox = useCallback(() => {
    if (!state.open) return null
    const it = state.items[state.idx] || {}
    const url = it.url
    const name = it.name || 'media'
    const _isImg = isImg(it)

    const doShare = () => {
      if (typeof onForward === 'function') {
        onForward({ items: state.items, selectedIndexes: [state.idx] })
      }
    }

    const copyAction = async () => {
      if (_isImg) {
        const ok = await copyImageBlob(url)
        if (ok) { toast?.success('Imagen copiada al portapapeles'); return }
        toast?.error('No se pudo copiar la imagen. Probá “Descargar”.'); return
      }
      try { await navigator.clipboard.writeText(url); toast?.success('Enlace copiado') }
      catch { toast?.error('No se pudo copiar el enlace') }
    }

    return createPortal(
      <div className="lbOverlay" role="dialog" aria-modal="true" aria-label="Visor de imágenes" onClick={close}>
        <div className="lbTopbar" onClick={(e)=>e.stopPropagation()}>
          <div className="title" title={name}>{name}</div>
          <div className="sp" />
          <a className="btn" href={url} download target="_blank" rel="noreferrer" title="Descargar"><FiDownload/></a>
          <button className="btn" onClick={doShare} title="Compartir / reenviar"><FiShare2/></button>
          <a className="btn" href={url} target="_blank" rel="noreferrer" title="Abrir original"><FiExternalLink/></a>
          <button className="btn" onClick={copyAction} title={_isImg ? 'Copiar imagen' : 'Copiar link'}><FiCopy/></button>
          <button className="btn close" onClick={close} aria-label="Cerrar"><FiX/></button>
        </div>

        {state.items.length > 1 && (
          <>
            <button className="navBtn left" onClick={(e)=>{ e.stopPropagation(); prev() }} aria-label="Anterior"><FiChevronLeft/></button>
            <button className="navBtn right" onClick={(e)=>{ e.stopPropagation(); next() }} aria-label="Siguiente"><FiChevronRight/></button>
          </>
        )}

        <div className="lbStage" onClick={(e)=>e.stopPropagation()}>
          {_isImg ? <img src={url} alt={name} /> : <iframe src={url} title={name} />}
        </div>
      </div>,
      document.body
    )
  }, [state, isImg, onForward, close, next, prev, toast])

  return { open, close, Lightbox }
}
