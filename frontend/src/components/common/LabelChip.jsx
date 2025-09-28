import React from 'react'
export default function LabelChip({ label, noBorder=false }){
  const bg = label?.color_hex || '#ffffff'
  const { color, isLight } = textFor(bg)
  return (
    <span className={`labelChip ${isLight ? 'is-light':''} ${noBorder?'no-border':''}`} style={{ background:bg, color }}>
      {label?.nombre || label?.codigo || 'Etiqueta'}
    </span>
  )
}
function hexToRgb(hex){ const h=(hex||'').replace('#','').padEnd(6,'0'); return {r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16)} }
function luminance({r,g,b}){ const a=[r,g,b].map(v=>{const s=v/255;return s<=.03928?s/12.92:Math.pow((s+.055)/1.055,2.4)}); return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2] }
function textFor(bg){ const L=luminance(hexToRgb(bg)); return { color: L>0.6 ? '#0c1117' : '#e8f0ff', isLight: L>0.6 } }
