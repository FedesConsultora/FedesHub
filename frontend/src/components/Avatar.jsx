import React, { useEffect, useState } from 'react'
import { resolveMediaUrl } from '../utils/media'
import './Avatar.scss'

function hashCode(str = '') {
  let h = 0; for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0 }
  return Math.abs(h)
}
function initialsFrom(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '—'
  const a = parts[0]?.[0] || ''
  const b = (parts.length > 1 ? parts[parts.length - 1][0] : '')
  return (a + b).toUpperCase()
}

/** Avatar con fallback a iniciales y manejo de onError */
export default function Avatar({
  name = '',
  src,
  size = 36,
  rounded = 'circle',   // 'circle' | 'md'
  className = ''
}) {
  const [broken, setBroken] = useState(false)
  useEffect(() => { setBroken(false) }, [src]) // si cambia src, resetea error

  const label = initialsFrom(name)
  const seed = hashCode(name || '·')
  const BG = ['#1b2a38', '#263445', '#1e2f3f', '#2b3442', '#233146', '#2a2d3b', '#1a2c3b', '#253246', '#1c2b3c', '#2b3340', '#203246', '#24344a']
  const bg = BG[seed % BG.length]
  const style = { width: size, height: size, lineHeight: `${size}px`, fontSize: Math.max(12, Math.round(size * 0.42)) }
  const cls = `fhAvatar ${rounded === 'circle' ? 'is-circle' : 'is-round'} ${className}`

  if (src && !broken) {
    return (
      <img
        src={resolveMediaUrl(src)}
        alt={name || ''}
        className={cls}
        style={{ width: size, height: size }}
        onError={() => setBroken(true)}
      />
    )
  }

  return (
    <span aria-hidden className={`${cls} is-fallback`} style={{ ...style, background: bg }}>
      {label}
    </span>
  )
}
