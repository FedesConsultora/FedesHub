import React, { useMemo, useRef, useEffect } from 'react'
import LeadsKanbanColumn from './LeadsKanbanColumn'
import { comercialApi } from '../../api/comercial'
import { useToast } from '../../components/toast/ToastProvider'
import './LeadsKanban.scss'

const DRAG_THRESHOLD = 6

export default function LeadsKanban({ leads = [], stages = [], loading, onCardClick, onUpdated }) {
    const toast = useToast()
    const columns = useMemo(() => {
        if (!stages.length) return {}
        const cols = {}
        stages.forEach(s => {
            cols[s.id] = leads.filter(r => r.etapa_id === s.id)
        })
        return cols
    }, [leads, stages])

    const boardRef = useRef(null)
    const bodyRefs = useRef({})

    // Initialize bodyRefs for each stage
    useEffect(() => {
        stages.forEach(s => {
            if (!bodyRefs.current[s.id]) bodyRefs.current[s.id] = { body: null }
        })
    }, [stages])

    const drag = useRef({
        active: false, id: null,
        fromCol: null, fromIndexVis: -1,
        curCol: null, ghost: null, placeholder: null, originEl: null,
        offsetX: 0, offsetY: 0, ptX: 0, ptY: 0, af: 0,
        maybe: null
    })

    const getBodiesRects = () => {
        const out = {}
        stages.forEach(s => {
            const el = bodyRefs.current[s.id]?.body
            if (el) out[s.id] = el.getBoundingClientRect()
        })
        return out
    }

    const placePlaceholder = (colId, pointerY) => {
        const body = bodyRefs.current[colId]?.body
        if (!body) return

        const ph = drag.current.placeholder
        const items = Array.from(body.querySelectorAll('.fh-k-task, .fh-k-placeholder'))
        let idx = items.length
        for (let i = 0; i < items.length; i++) {
            const r = items[i].getBoundingClientRect()
            const mid = r.top + r.height / 2
            if (pointerY < mid) { idx = i; break }
        }

        if (ph && ph.parentElement !== body) body.appendChild(ph)
        if (ph && items[idx] !== ph) body.insertBefore(ph, items[idx] || null)
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
        for (const [id, r] of Object.entries(rects)) {
            if (drag.current.ptX >= r.left && drag.current.ptX <= r.right) { targetCol = id; break }
        }
        drag.current.curCol = targetCol

        placePlaceholder(targetCol, drag.current.ptY)
        autoScroll()
    }

    const pointerMove = (ev) => {
        if (!drag.current.active && drag.current.maybe) {
            const dx = Math.abs(ev.clientX - drag.current.maybe.x)
            const dy = Math.abs(ev.clientY - drag.current.maybe.y)
            if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
                const m = drag.current.maybe
                drag.current.maybe = null
                beginDrag(ev, m.colId, m.indexVisible, m.id)
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
        } catch { }
    }

    const endDrag = async () => {
        if (!drag.current.active) {
            drag.current.maybe = null
            document.removeEventListener('pointermove', pointerMove)
            document.removeEventListener('pointerup', endDrag)
            document.body.classList.remove('fh-noselect')
            return
        }

        document.removeEventListener('pointermove', pointerMove)
        document.removeEventListener('pointerup', endDrag)
        document.body.classList.remove('fh-noselect')

        const toCol = drag.current.curCol
        const id = drag.current.id

        cleanupDom()
        if (drag.current.af) cancelAnimationFrame(drag.current.af)

        if (toCol && toCol !== String(drag.current.fromCol)) {
            try {
                await comercialApi.updateLead(id, { etapa_id: toCol })
                toast.success('Etapa actualizada')
                onUpdated?.()
            } catch (err) {
                toast.error('Error al mover el lead')
            }
        }

        drag.current.active = false
        drag.current.id = null
    }

    const beginDrag = (ev, colId, indexVisible, id) => {
        const body = bodyRefs.current[colId]?.body
        if (!body) return

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
            active: true, id,
            fromCol: colId, fromIndexVis: indexVisible,
            curCol: colId,
            ghost, placeholder: ph, originEl: card,
            offsetX: ev.clientX - r.left, offsetY: ev.clientY - r.top,
            ptX: ev.clientX, ptY: ev.clientY, af: 0,
            maybe: null
        }

        document.body.classList.add('fh-noselect')
    }

    const startDrag = (ev, colId, indexVisible, indexReal, id) => {
        if (ev.button != null && ev.button !== 0) return
        drag.current.maybe = { x: ev.clientX, y: ev.clientY, colId, indexVisible, indexReal, id }
        document.addEventListener('pointermove', pointerMove, { passive: true })
        document.addEventListener('pointerup', endDrag, { passive: true })
    }

    useEffect(() => () => { try { cleanupDom() } catch { } }, [])

    if (loading) return <div className="kanban-loading">Cargando pipeline...</div>

    return (
        <div className="LeadsKanban fh-k-board" ref={boardRef}>
            {stages.map(s => (
                <LeadsKanbanColumn
                    key={s.id}
                    id={s.id}
                    nombre={s.nombre}
                    leads={columns[s.id] || []}
                    bodyRef={(el) => {
                        if (bodyRefs.current[s.id]) bodyRefs.current[s.id].body = el
                    }}
                    onStartDrag={startDrag}
                    onCardClick={onCardClick}
                />
            ))}
        </div>
    )
}
