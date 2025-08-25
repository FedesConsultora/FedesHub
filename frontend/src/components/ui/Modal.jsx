export default function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null
  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'grid', placeItems:'center', zIndex:50}}>
      <div style={{width:'min(640px, 92vw)', background:'#121a23', border:'1px solid #223', borderRadius:16}}>
        <div style={{padding:'12px 16px', borderBottom:'1px solid #223', fontWeight:700}}>{title}</div>
        <div style={{padding:'16px'}}>{children}</div>
        <div style={{padding:'12px 16px', borderTop:'1px solid #223', display:'flex', gap:8, justifyContent:'flex-end'}}>
          {footer || <button onClick={onClose}>Cerrar</button>}
        </div>
      </div>
    </div>
  )
}
