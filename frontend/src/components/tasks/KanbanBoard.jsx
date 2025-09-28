import { useEffect, useMemo, useRef } from 'react'
import useTasksBoard, { STAGES } from '../../hooks/useTasksBoard'
import KanbanColumn from './KanbanColumn'
import './kanban.scss'

const DRAG_THRESHOLD = 6 // px de movimiento antes de iniciar drag

export default function KanbanBoard({ compact=false, maxRows=4, params, board:extBoard, moveTask:extMove }) {
  const internal = extBoard ? null : useTasksBoard(params)
  const board    = extBoard ?? internal?.board ?? { columns: Object.fromEntries(STAGES.map(s => [s.code, []])) }
  const moveTask = extMove ?? internal?.moveTask ?? (() => {})

  const columns = board.columns
  const boardRef = useRef(null)
  const bodyRefs = useRef(Object.fromEntries(STAGES.map(s => [s.code, { body: null }])))

  const visibleMapRef = useRef({})
  const drag = useRef({
    active:false, id:null,
    fromCol:null, fromIndexReal:-1, fromIndexVis:-1,
    curCol:null, ghost:null, placeholder:null, originEl:null,
    offsetX:0, offsetY:0, ptX:0, ptY:0, af:0,
    maybe:null // {x,y, colCode, indexVisible, indexReal, id}
  })

  const computeVisible = () => {
    const out = {}
    for (const s of STAGES) {
      const full = columns[s.code] || []
      const items = compact ? full.slice(0, maxRows) : full
      const indices = items.map(item => full.findIndex(it => it.id === item.id))
      out[s.code] = { items, indices, fullLen: full.length }
    }
    return out
  }

  const visible = useMemo(computeVisible, [columns, compact, maxRows])
  useEffect(() => { visibleMapRef.current = visible }, [visible])

  const getBodiesRects = () => {
    const out = {}
    for (const s of STAGES) {
      const el = bodyRefs.current[s.code]?.body
      if (el) out[s.code] = el.getBoundingClientRect()
    }
    return out
  }

  const placePlaceholder = (colCode, pointerY) => {
    const body = bodyRefs.current[colCode]?.body
    if (!body) return { toCol: colCode, toIndexVis: 0 }

    const ph = drag.current.placeholder
    const items = Array.from(body.querySelectorAll('.fh-k-task, .fh-k-placeholder'))
    let idx = items.length
    for (let i=0;i<items.length;i++){
      const r = items[i].getBoundingClientRect()
      const mid = r.top + r.height/2
      if (pointerY < mid) { idx = i; break }
    }

    if (ph && ph.parentElement !== body) body.appendChild(ph)
    if (ph && items[idx] !== ph) body.insertBefore(ph, items[idx] || null)

    return { toCol: colCode, toIndexVis: Math.max(0, Array.from(body.children).indexOf(ph)) }
  }

  const autoScroll = () => {
    const b = boardRef.current
    if (!b) return
    const pad = 56, step = 24
    const br = b.getBoundingClientRect()

    if (drag.current.ptX > br.right - pad) b.scrollLeft += step
    else if (drag.current.ptX < br.left + pad) b.scrollLeft -= step

    const body = bodyRefs.current[drag.current.curCol]?.body
    if (body) {
      const r = body.getBoundingClientRect()
      if (drag.current.ptY > r.bottom - pad) body.scrollTop += step
      else if (drag.current.ptY < r.top + pad) body.scrollTop -= step
    }
  }

  const onMoveFrame = () => {
    drag.current.af = 0
    const g = drag.current.ghost
    if (!g) return

    g.style.transform = `translate(${drag.current.ptX - drag.current.offsetX}px, ${drag.current.ptY - drag.current.offsetY}px)`

    const rects = getBodiesRects()
    let targetCol = drag.current.curCol
    for (const [code, r] of Object.entries(rects)) {
      if (drag.current.ptX >= r.left && drag.current.ptX <= r.right) { targetCol = code; break }
    }
    drag.current.curCol = targetCol

    placePlaceholder(targetCol, drag.current.ptY)
    autoScroll()
  }

  const pointerMove = (ev) => {
    // Si aún no activamos el drag, verificar umbral
    if (!drag.current.active && drag.current.maybe) {
      const dx = Math.abs(ev.clientX - drag.current.maybe.x)
      const dy = Math.abs(ev.clientY - drag.current.maybe.y)
      if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
        // ¡Ahora sí! empezamos el drag “real”
        const m = drag.current.maybe
        drag.current.maybe = null
        beginDrag(ev, m.colCode, m.indexVisible, m.indexReal, m.id)
        return
      }
    }

    if (!drag.current.active) return
    drag.current.ptX = ev.clientX
    drag.current.ptY = ev.clientY
    if (!drag.current.af) drag.current.af = requestAnimationFrame(onMoveFrame)
  }

  const cleanupDom = () => {
    try {
      drag.current.originEl && (drag.current.originEl.style.visibility = '')
      drag.current.placeholder && drag.current.placeholder.remove()
      drag.current.ghost && drag.current.ghost.remove()
    } catch {}
  }

  const cancelFrame = () => {
    try { if (drag.current.af) cancelAnimationFrame(drag.current.af) } catch {}
    drag.current.af = 0
  }

  const endDrag = () => {
    // Si nunca pasamos el umbral → era un click: NO interferimos
    if (!drag.current.active) {
      drag.current.maybe = null
      document.removeEventListener('pointermove', pointerMove)
      document.removeEventListener('pointerup', endDrag)
      document.removeEventListener('keydown', onKeyDownEscape)
      document.body.classList.remove('fh-noselect')
      return
    }

    document.removeEventListener('pointermove', pointerMove)
    document.removeEventListener('pointerup', endDrag)
    document.removeEventListener('keydown', onKeyDownEscape)
    document.body.classList.remove('fh-noselect')

    const ph = drag.current.placeholder
    const body = ph?.parentElement
    let toCol = drag.current.curCol
    let toIndexVis = drag.current.fromIndexVis

    if (body && ph) {
      const nodes = Array.from(body.querySelectorAll('.fh-k-task, .fh-k-placeholder'))
      toIndexVis = Math.max(0, nodes.indexOf(ph))
    }

    const vm = visibleMapRef.current
    const vInfo = vm[toCol] || { indices: [], fullLen: 0 }
    let toIndexReal
    if (toIndexVis < vInfo.indices.length) toIndexReal = vInfo.indices[toIndexVis]
    else toIndexReal = vInfo.fullLen

    if (toCol === drag.current.fromCol && toIndexReal > drag.current.fromIndexReal) {
      toIndexReal -= 1
    }

    cleanupDom()
    cancelFrame()

    const payload = {
      fromCol: drag.current.fromCol,
      fromIndex: drag.current.fromIndexReal,
      toCol,
      toIndex: Math.max(0, toIndexReal)
    }

    drag.current.active = false
    drag.current.id = null

    if (payload.fromCol === payload.toCol && payload.fromIndex === payload.toIndex) return
    moveTask(payload)
  }

  const onKeyDownEscape = (e) => {
    if (e.key === 'Escape') {
      document.removeEventListener('pointermove', pointerMove)
      document.removeEventListener('pointerup', endDrag)
      document.removeEventListener('keydown', onKeyDownEscape)
      document.body.classList.remove('fh-noselect')
      cleanupDom()
      cancelFrame()
      drag.current.active = false
      drag.current.id = null
      drag.current.maybe = null
    }
  }

  // --- era tu startDrag original; ahora lo llamamos sólo tras el threshold ---
  const beginDrag = (ev, colCode, indexVisible, indexReal, id) => {
    const body = bodyRefs.current[colCode]?.body
    if (!body) return

    document.querySelectorAll('.fh-k-placeholder').forEach(n => n.remove())

    const cards = body.querySelectorAll('.fh-k-task')
    const card = cards[indexVisible]
    if (!card) return

    const r = card.getBoundingClientRect()

    const ghost = card.cloneNode(true)
    ghost.classList.add('fh-k-ghost')
    ghost.style.width = `${r.width}px`
    ghost.style.height = `${r.height}px`
    ghost.style.transform = `translate(${r.left}px, ${r.top}px)`
    document.body.appendChild(ghost)

    const ph = document.createElement('div')
    ph.className = 'fh-k-placeholder'
    ph.style.height = `${r.height}px`
    card.after(ph)
    card.style.visibility = 'hidden'

    drag.current = {
      ...drag.current,
      active:true, id,
      fromCol:colCode, fromIndexReal:indexReal, fromIndexVis:indexVisible,
      curCol:colCode,
      ghost, placeholder:ph, originEl:card,
      offsetX: ev.clientX - r.left, offsetY: ev.clientY - r.top,
      ptX: ev.clientX, ptY: ev.clientY, af: 0,
      maybe:null
    }

    document.body.classList.add('fh-noselect')
  }

  // Este es el handler que pasa KanbanColumn al card
  const startDrag = (ev, colCode, indexVisible, indexReal, id) => {
    if (ev.button != null && ev.button !== 0) return
    // NO iniciamos drag aún: sólo “armamos” la intención
    drag.current.maybe = { x: ev.clientX, y: ev.clientY, colCode, indexVisible, indexReal, id }
    try { ev.currentTarget?.setPointerCapture?.(ev.pointerId) } catch {}
    document.addEventListener('pointermove', pointerMove, { passive:true })
    document.addEventListener('pointerup', endDrag, { passive:true })
    document.addEventListener('keydown', onKeyDownEscape)
  }

  useEffect(() => () => { try{ endDrag() }catch{} }, [])

  const cols = useMemo(() =>
    STAGES.map(s => ({
      ...s,
      items: visible[s.code]?.items || [],
      indices: visible[s.code]?.indices || []
    })),
  [visible])

  return (
    <div className={`fh-k-board ${compact ? 'is-compact' : ''}`} ref={boardRef}>
      {cols.map(c => (
        <KanbanColumn
          key={c.code}
          code={c.code}
          title={c.name}
          items={c.items}
          indices={c.indices}
          bodyRef={(el) => (bodyRefs.current[c.code].body = el)}
          onStartDrag={startDrag}  // 👈 ahora respeta el threshold
        />
      ))}
    </div>
  )
}