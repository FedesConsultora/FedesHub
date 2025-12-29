import React, { useEffect, useRef, useState } from 'react'
import { resolveMediaUrl } from '../utils/media'
import { useProfilePreview } from '../context/ProfilePreviewProvider'
import './Avatar.scss'

function hashCode(str = '') {
  let h = 0; for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0 }
  return Math.abs(h)
}
function initialsFrom(name = '') {
  const cleanName = String(name).replace(/^[\d\s\-_.]+/, '').trim();
  const parts = cleanName.split(/\s+/).filter(Boolean)
  if (!parts.length) return String(name).trim().charAt(0).toUpperCase() || '—'

  const a = parts[0]?.[0] || ''
  const b = (parts.length > 1 ? parts[parts.length - 1][0] : '')
  return (a + b).toUpperCase()
}

/** 
 * Avatar con fallback a iniciales y manejo de onError.
 * Soporta previsualización de perfil si se provee federId.
 */
export default function Avatar({
  name = '',
  src,
  size = 36,
  rounded = 'circle',   // 'circle' | 'md'
  className = '',
  federId = null,       // Nuevo: ID para previsualización
  enablePreview = true  // Nuevo: para desactivar si es necesario
}) {
  const [broken, setBroken] = useState(false)
  const hoverTimer = useRef(null)
  const { openProfile } = useProfilePreview()

  useEffect(() => { setBroken(false) }, [src])

  const label = initialsFrom(name)
  const seed = hashCode(name || '·')
  const BG = ['#1b2a38', '#263445', '#1e2f3f', '#2b3442', '#233146', '#2a2d3b', '#1a2c3b', '#253246', '#1c2b3c', '#2b3340', '#203246', '#24344a']
  const bg = BG[seed % BG.length]
  const style = { width: size, height: size, lineHeight: `${size}px`, fontSize: Math.max(12, Math.round(size * 0.42)) }

  const isPreviewable = federId && enablePreview
  const cls = `fhAvatar ${rounded === 'circle' ? 'is-circle' : 'is-round'} ${isPreviewable ? 'is-previewable' : ''} ${className}`

  const handleMouseEnter = (e) => {
    if (!isPreviewable) return
    const rect = e.currentTarget.getBoundingClientRect()
    hoverTimer.current = setTimeout(() => {
      openProfile(federId, rect)
    }, 600) // 600ms delay for hover preview
  }

  const handleMouseLeave = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current)
      hoverTimer.current = null
    }
  }

  const handleClick = (e) => {
    if (!isPreviewable) return
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    openProfile(federId, rect)
  }

  const sharedProps = {
    className: cls,
    style: { width: size, height: size, ...style },
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onClick: handleClick,
    title: isPreviewable ? `Ver perfil de ${name}` : undefined
  }

  if (src && !broken) {
    return (
      <img
        {...sharedProps}
        src={resolveMediaUrl(src)}
        alt={name || ''}
        onError={() => setBroken(true)}
      />
    )
  }

  return (
    <span {...sharedProps} aria-hidden className={`${cls} is-fallback`} style={{ ...sharedProps.style, background: bg }}>
      {label}
    </span>
  )
}
