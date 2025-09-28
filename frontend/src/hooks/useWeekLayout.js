// src/hooks/useWeekLayout.js
import { useMemo } from 'react'

export const SNAP_MIN = 15

export function parseDate(v){
  if (!v) return null
  try{
    if (v instanceof Date) return isNaN(+v) ? null : v
    let s = String(v).trim()
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) s = s.replace(' ','T')
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) s = s + ':00'
    const d = new Date(s)
    return isNaN(+d) ? null : d
  }catch{ return null }
}

// lanes seguros (clusters) con colocación estable y defensiva
export function laneEvents(list, snapMin = SNAP_MIN) {
  const SNAP = snapMin * 60000

  const cleaned = list.map(e => {
    const s = parseDate(e.starts_at)
    const e0 = parseDate(e.ends_at)
    if (!s) return null
    const ee = (e0 && +e0 > +s) ? e0 : new Date(+s + SNAP) // mínimo 15'
    return { ...e, _s:+s, _e:+ee }
  }).filter(Boolean)

  cleaned.sort((a,b)=> a._s - b._s)

  const out = []
  let cluster = []
  let clusterEnd = -Infinity

  const placeInLane = (lanesEnd, s, e) => {
    for (let i=0;i<lanesEnd.length;i++){
      if (s >= lanesEnd[i]) { lanesEnd[i] = e; return i }
    }
    lanesEnd.push(e)
    return lanesEnd.length - 1
  }

  const flush = ()=>{
    if (!cluster.length) return
    const lanesEnd = []
    for (const e of cluster){
      const lane = placeInLane(lanesEnd, e._s, e._e)
      out.push({ ...e, _lane: lane, _clusterSize: lanesEnd.length })
    }
    cluster = []
    clusterEnd = -Infinity
  }

  for (const e of cleaned){
    if (!cluster.length){ cluster=[e]; clusterEnd=e._e; continue }
    if (e._s < clusterEnd){ cluster.push(e); clusterEnd = Math.max(clusterEnd, e._e) }
    else { flush(); cluster=[e]; clusterEnd=e._e }
  }
  flush()
  return out
}

// Agrupa por día y aplica lanes
export function useWeekBuckets(events=[], days=[], { snapMin=SNAP_MIN } = {}) {
  const SNAP = snapMin*60000
  return useMemo(()=>{
    const byDay = Array.from({length:7}, ()=>({ allDay:[], timed:[], maxLanes:1 }))
    const norm = events.map(ev=>{
      const s = parseDate(ev.starts_at)
      const e0= parseDate(ev.ends_at)
      if (!s) return null
      const ee = (e0 && +e0 > +s) ? e0 : new Date(+s + SNAP)
      return { ...ev, starts_at:s.toISOString(), ends_at:ee.toISOString() }
    }).filter(Boolean)

    for (const ev of norm){
      const s = new Date(ev.starts_at), ee = new Date(ev.ends_at)
      for (let i=0;i<7;i++){
        const d0 = days[i], d1 = new Date(+d0 + 86400000)
        if (ee <= d0 || s >= d1) continue
        const isAll = ev.all_day || (s.getHours()===0 && ee.getHours()===0 && (+ee - +s) >= 86400000)
        if (isAll) byDay[i].allDay.push(ev)
        else byDay[i].timed.push(ev)
      }
    }
    for (let i=0;i<7;i++){
      const withLanes = laneEvents(byDay[i].timed, snapMin)
      byDay[i].timed = withLanes
      byDay[i].maxLanes = Math.max(1, ...withLanes.map(e=>e._clusterSize||1))
    }
    return byDay
  }, [events, days, snapMin])
}
