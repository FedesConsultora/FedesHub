// src/components/calendario/WeekGrid.jsx
import { useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react'
import { useWeekBuckets, parseDate, SNAP_MIN } from '../../hooks/useWeekLayout'
import './WeekGrid.scss'

const two = n=>String(n).padStart(2,'0')
const MINUTE_PX = 1
const H_START   = 6
const H_END     = 22
const TOTAL_MIN = (H_END - H_START) * 60

const LONG_PRESS_MS = 3000
const DAY_W   = 220
const GUTTER_W= 70
const GAP_PX  = 4
const PAGE_SIZE = 3

const startOfWeek = (d)=>{ const x=new Date(d); const wd=(x.getDay()+6)%7; x.setDate(x.getDate()-wd); x.setHours(0,0,0,0); return x }
const addDays = (d, n)=> new Date(d.getFullYear(), d.getMonth(), d.getDate()+n)

export default function WeekGrid({
  anchor=new Date(),
  events=[],
  dayBadges = Array.from({length:7},()=>[]),
  onCreateRange,
  onDayClick,
  onEventClick
}){
  const week0 = useMemo(()=> startOfWeek(anchor), [anchor])
  const days = useMemo(()=> [...Array(7)].map((_,i)=> addDays(week0,i)), [week0])

  // refs
  const scrollRef = useRef(null)
  const bodyRef   = useRef(null)
  const headerRef = useRef(null)
  const alldayRefs= useRef(Array.from({length:7}, ()=>null))

  const [alldayH, setAlldayH] = useState(35)
  const [isDragging, setIsDragging] = useState(false)
  const [draft, setDraft] = useState(null)
  const gestureRef   = useRef({ dayIdx:-1, y1:0, y2:0, pointerId:null, active:false })
  const longTimerRef = useRef(null)
  const swipeRef     = useRef({x0:0, t0:0, dayIdx:-1})
  const [lanePage, setLanePage] = useState(()=> Array.from({length:7}, ()=>0))

  // buckets por día (separado del render)
  const perDay = useWeekBuckets(events, days, { snapMin: SNAP_MIN })
  const perDayRef = useRef(perDay)
  useEffect(()=>{ perDayRef.current = perDay }, [perDay])

  useLayoutEffect(()=>{
    const h = Math.max(30, ...alldayRefs.current.map(el => (el?.offsetHeight ?? 0)))
    setAlldayH(h)
  }, [dayBadges, perDay])

  useEffect(()=>{
    const onResize = ()=>{
      const h = Math.max(30, ...alldayRefs.current.map(el => (el?.offsetHeight ?? 0)))
      setAlldayH(h)
    }
    window.addEventListener('resize', onResize)
    return ()=> window.removeEventListener('resize', onResize)
  }, [])

  useEffect(()=>{
    const sc = scrollRef.current; const head = headerRef.current
    if (!sc || !head) return
    const onScroll = ()=> { head.scrollLeft = sc.scrollLeft }
    sc.addEventListener('scroll', onScroll)
    return ()=> sc.removeEventListener('scroll', onScroll)
  }, [])

  const timelineHeight = TOTAL_MIN * MINUTE_PX
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
  const yToMinute = (y)=> clamp(Math.round((y / MINUTE_PX) / SNAP_MIN) * SNAP_MIN, 0, TOTAL_MIN)
  const minuteToTop = (m)=> clamp(m, 0, TOTAL_MIN) * MINUTE_PX
  const toLocalISO = (d, minutes)=>{
    const h = Math.floor(minutes/60)+H_START, m = minutes%60
    return `${d.getFullYear()}-${two(d.getMonth()+1)}-${two(d.getDate())}T${two(h)}:${two(m)}:00`
  }

  useEffect(()=>{
    const el = bodyRef.current; if (!el) return

    const startDrag = (dayIdx, y) => {
      gestureRef.current = { ...gestureRef.current, dayIdx, y1: y, y2: y, active:true }
      setIsDragging(true)
      setDraft({ dayIdx, y1: y, y2: y })
    }

    const onPointerDown = (e)=>{
      const col = e.target.closest('[data-col]')
      if (!col) return
      if (e.target.closest('.wk-event')) return

      const rect = col.getBoundingClientRect()
      const y = e.clientY - rect.top
      const dayIdx = Number(col.dataset.col)
      gestureRef.current = { dayIdx, y1:y, y2:y, pointerId: e.pointerId, active:false }
      col.setPointerCapture?.(e.pointerId)

      swipeRef.current = { x0: e.clientX, t0: Date.now(), dayIdx }

      if (e.pointerType === 'mouse') {
        startDrag(dayIdx, y)
      } else {
        clearTimeout(longTimerRef.current)
        longTimerRef.current = setTimeout(()=> startDrag(dayIdx, y), LONG_PRESS_MS)
      }
      e.preventDefault()
    }

    const onPointerMove = (e)=>{
      const g = gestureRef.current
      if (g.dayIdx<0) return
      const col = el.querySelector(`[data-col="${g.dayIdx}"]`)
      if (!col) return
      const rect = col.getBoundingClientRect()
      const y2 = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
      gestureRef.current.y2 = y2
      if (g.active) setDraft({ dayIdx: g.dayIdx, y1: g.y1, y2 })
    }

    const finish = (e)=>{
      const g = gestureRef.current
      clearTimeout(longTimerRef.current)

      // swipe para paginar carriles si no hubo drag
      if (!isDragging && !g.active && e && e.pointerType!=='mouse'){
        const dx = e.clientX - swipeRef.current.x0
        const dt = Date.now() - swipeRef.current.t0
        if (Math.abs(dx) > 48 && dt < 400){
          const di = swipeRef.current.dayIdx
          const maxL = perDayRef.current?.[di]?.maxLanes || 1
          const pages = Math.ceil(maxL / PAGE_SIZE)
          if (pages > 1){
            setLanePage(p=>{
              const copy = [...p]
              const curr = copy[di] || 0
              const next = Math.max(0, Math.min(pages-1, curr + (dx<0 ? 1 : -1)))
              copy[di] = next
              return copy
            })
          }
        }
      }

      if (isDragging && g.active) {
        const dmin = Math.min(yToMinute(g.y1), yToMinute(g.y2))
        const dmax = Math.max(yToMinute(g.y1), yToMinute(g.y2))
        const day = days[g.dayIdx]
        setDraft(null); setIsDragging(false)
        if (typeof onCreateRange === 'function' && dmax > dmin) {
          onCreateRange({
            starts_at: toLocalISO(day, dmin),
            ends_at:   toLocalISO(day, Math.max(dmin+SNAP_MIN, dmax))
          })
        }
      } else {
        setDraft(null); setIsDragging(false)
      }
      gestureRef.current = { dayIdx:-1, y1:0, y2:0, pointerId:null, active:false }
    }

    const onPointerUp = (e)=> finish(e)
    const onPointerCancel = (e)=> { clearTimeout(longTimerRef.current); finish(e) }

    el.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
    return ()=>{
      el.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
      clearTimeout(longTimerRef.current)
    }
  }, [days, onCreateRange, isDragging])

  const gridWidth = `${GUTTER_W + (7 * DAY_W)}px`
  const cols = `70px repeat(7, ${DAY_W}px)`

  return (
    <div className="week-grid">
      <div className="wk-scroll" ref={scrollRef}>
        <div className="wk-header" ref={headerRef} style={{ width: gridWidth, gridTemplateColumns: cols }}>
          <div className="time-gutter sticky" aria-hidden />
          {days.map((d,i)=>(
            <button
              key={i}
              className="day-h"
              tabIndex={0}
              onClick={()=>onDayClick?.(`${d.getFullYear()}-${two(d.getMonth()+1)}-${two(d.getDate())}`)}
              onKeyDown={(ev)=>{ if (ev.key==='Enter' || ev.key===' ') onDayClick?.(`${d.getFullYear()}-${two(d.getMonth()+1)}-${two(d.getDate())}`)}}
              title={d.toLocaleDateString(undefined,{ weekday:'long', day:'numeric', month:'long' })}
            >
              {d.toLocaleDateString(undefined,{ weekday:'short', day:'numeric', month:'short' })}
            </button>
          ))}
        </div>

        <div className="wk-body" ref={bodyRef} style={{ width: gridWidth, gridTemplateColumns: cols }}>
          <div className="time-gutter sticky" style={{ height: timelineHeight, marginTop: `${alldayH + 4}px` }}>
            {Array.from({length:(H_END-H_START)+1},(_,i)=>(
              <div key={i} className="hline" style={{ top: (i*60) * MINUTE_PX }}>
                <span className="lbl">{two(H_START+i)}:00</span>
              </div>
            ))}
          </div>

          {days.map((d,i)=>{
            const list = perDay[i]
            const maxLanes = list.maxLanes
            const totalPages = Math.ceil(maxLanes / PAGE_SIZE)
            const page = Math.min(lanePage[i] || 0, Math.max(0, totalPages-1))
            const lanesShowing = Math.min(PAGE_SIZE, Math.max(1, maxLanes - page*PAGE_SIZE))
            const hasLeft  = page > 0
            const hasRight = page < totalPages-1

            return (
              <div key={i} className="day-col">
                <div className="allday" ref={el => (alldayRefs.current[i]=el)} style={{ height: alldayH }} tabIndex={0} aria-label={`Todo el día ${d.toLocaleDateString()}`}>
                  {dayBadges[i]?.map((b,idx)=>(
                    <span key={`b-${idx}`} className="wk-chip" style={{ borderColor:b.color, color:b.color }}>{b.label}</span>
                  ))}
                  {list.allDay.map(ev=>(
                    <button
                      key={ev.id}
                      className="wk-chip clickable"
                      title={ev.titulo}
                      style={{ borderColor: ev.color || '#88b' }}
                      onClick={()=> onEventClick?.(ev)}
                    >
                      {ev.titulo}
                    </button>
                  ))}
                </div>

                <div className={`hours ${hasLeft?'more-left':''} ${hasRight?'more-right':''}`} data-col={i} style={{ height: timelineHeight }} tabIndex={0}>
                  {Array.from({length:(H_END-H_START)+1},(_,h)=>(
                    <div key={h} className="hline" style={{ top: (h*60) * MINUTE_PX }} />
                  ))}

                  {totalPages>1 && (
                    <div className="lane-indicator">
                      <button className="nav" disabled={!hasLeft} onClick={()=> setLanePage(p=>{ const c=[...p]; c[i]=Math.max(0, page-1); return c })} aria-label="Carriles anteriores">‹</button>
                      <span className="cnt">{page+1}/{totalPages}</span>
                      <button className="nav" disabled={!hasRight} onClick={()=> setLanePage(p=>{ const c=[...p]; c[i]=Math.min(totalPages-1, page+1); return c })} aria-label="Carriles siguientes">›</button>
                    </div>
                  )}

                  {list.timed.map(ev=>{
                    const s = parseDate(ev.starts_at), e = parseDate(ev.ends_at)
                    if (!s || !e) return null

                    // ⬇️ intersección con la ventana visible para evitar el "06:00–06:15"
                    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), H_START, 0, 0, 0).getTime()
                    const dayEnd   = new Date(d.getFullYear(), d.getMonth(), d.getDate(), H_END,   0, 0, 0).getTime()
                    const segStart = Math.max(s.getTime(), dayStart)
                    const segEnd   = Math.min(e.getTime(), dayEnd)
                    if (segEnd <= segStart) return null

                    const startMin = Math.round((segStart - dayStart) / 60000)
                    const endMin   = Math.round((segEnd   - dayStart) / 60000)

                    const laneGlobal = ev._lane || 0
                    if (laneGlobal < page*PAGE_SIZE || laneGlobal >= page*PAGE_SIZE + lanesShowing) return null
                    const laneLocal = laneGlobal - page*PAGE_SIZE

                    const widthCss = `calc((100% - ${(lanesShowing-1)*GAP_PX}px) / ${lanesShowing})`
                    const leftCss  = `calc((${widthCss} + ${GAP_PX}px) * ${laneLocal})`

                    return (
                      <button
                        key={ev.id}
                        className="wk-event strong"
                        title={ev.titulo}
                        tabIndex={0}
                        onClick={()=> onEventClick?.(ev)}
                        style={{
                          top: startMin * MINUTE_PX,
                          height: Math.max(18, (endMin - startMin) * MINUTE_PX),
                          left: leftCss,
                          width: widthCss,
                          borderLeftColor: ev.color || '#88b'
                        }}
                      >
                        <div className="ttl">{ev.titulo}</div>
                        <div className="when">
                          {s.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                          {' – '}
                          {e.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                        </div>
                      </button>
                    )
                  })}

                  {draft && draft.dayIdx===i && (() => {
                    const m1 = Math.min(Math.max(0, Math.round(draft.y1 / MINUTE_PX / SNAP_MIN) * SNAP_MIN), TOTAL_MIN)
                    const m2 = Math.min(Math.max(0, Math.round(draft.y2 / MINUTE_PX / SNAP_MIN) * SNAP_MIN), TOTAL_MIN)
                    const a = Math.min(m1,m2), b = Math.max(m1,m2)
                    return (
                      <div className="wk-draft" style={{ top: a * MINUTE_PX, height: Math.max(1, (Math.max(a+SNAP_MIN,b) - a) * MINUTE_PX) }}>
                        <span className="lbl">
                          {(() => {
                            const fmt = (m)=> `${two(Math.floor(m/60)+H_START)}:${two(m%60)}`
                            return `${fmt(a)} – ${fmt(Math.max(a+SNAP_MIN, b))}`
                          })()}
                        </span>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
