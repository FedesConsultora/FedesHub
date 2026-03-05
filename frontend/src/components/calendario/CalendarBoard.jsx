import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import usePermission from '../../hooks/usePermissions'
import useFeders from '../../hooks/useFeders'
import { useCalendarBoard, useCalendarios, useEventos, useMisCalendarios, isoDate } from '../../hooks/useCalendario'
import { federsApi } from '../../api/feders'
import { calendarioApi } from '../../api/calendario'
import { useModal } from '../modal/ModalProvider.jsx'
import CalendarToolbar from './CalendarToolbar'
import MonthGrid from './MonthGrid'
import WeekGrid from './WeekGrid'
import DayDetails from './dialogs/DayDetails'
import EventForm from './dialogs/EventForm'
import GoogleConnect from './GoogleConnect'
import './CalendarBoard.scss'

const two = n => String(n).padStart(2, '0')
const startOfWeek = (d) => { const x = new Date(d); const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); x.setHours(0, 0, 0, 0); return x }
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

export default function CalendarBoard() {
  const modal = useModal()
  const { can } = usePermission()
  const canCreate = can('calendario', 'create')
  const canUpdate = can('calendario', 'update')
  const canDelete = can('calendario', 'delete')

  const board = useCalendarBoard(new Date())

  const [view, setView] = useState(() => localStorage.getItem('cal:view') || 'week')
  useEffect(() => { localStorage.setItem('cal:view', view) }, [view])

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))

  const { rows: calList } = useCalendarios({ include_inactive: false })
  const { rows: myCals } = useMisCalendarios()

  // Lista unificada de todos los calendarios accesibles
  const allAvailableCalendars = useMemo(() => {
    const all = [...(myCals || []), ...(calList || [])];
    const unique = new Map();
    all.forEach(c => unique.set(c.id, c));
    return [...unique.values()];
  }, [myCals, calList]);

  const [selectedCalIds, setSelectedCalIds] = useState([])
  useEffect(() => {
    if ((selectedCalIds?.length ?? 0) === 0 && (allAvailableCalendars?.length ?? 0) > 0) {
      // Por defecto seleccionar todos (overlay)
      setSelectedCalIds(allAvailableCalendars.map(c => c.id))
    }
  }, [allAvailableCalendars]) // eslint-disable-line

  const { rows: feders } = useFeders({ limit: 200, activo: true })
  const federById = useMemo(() => Object.fromEntries(feders.map(f => [f.id, f])), [feders])

  const range = useMemo(() => {
    if (view === 'week') {
      const from = isoDate(weekStart)
      const to = isoDate(addDays(weekStart, 6))
      return { from, to }
    }
    return { from: board.from, to: board.to }
  }, [view, board.from, board.to, weekStart])

  const { rows: eventsRows, refetch: refetchEvents } = useEventos({
    from: range.from,
    to: range.to,
    calendarIds: (selectedCalIds.length ? selectedCalIds : allAvailableCalendars.map(c => c.id))
  })

  // Mapeo de colores por calendario para los eventos
  const calColorMap = useMemo(() => {
    return Object.fromEntries(allAvailableCalendars.map(c => [c.id, c.color || '#3b82f6']));
  }, [allAvailableCalendars]);

  // eco inmediato local
  const [localRows, setLocalRows] = useState([])
  const allRows = useMemo(() => {
    const map = new Map()
      ;[...(eventsRows || []), ...localRows].forEach(e => {
        if (e?.id) {
          // Asegurar que el evento tenga el color del calendario si no tiene uno propio
          const color = e.color || calColorMap[e.calendario_local_id] || '#3b82f6';
          map.set(e.id, { ...e, color });
        }
      });
    return [...map.values()]
  }, [eventsRows, localRows, calColorMap])

  // 🔒 ref para evitar stale-closure en openDay
  const allRowsRef = useRef(allRows)
  useEffect(() => { allRowsRef.current = allRows }, [allRows])

  // ── Badges all-day (asistencia, etc.)
  const [dayBadges, setDayBadges] = useState(() => Array.from({ length: 7 }, () => []))
  useEffect(() => {
    let alive = true
      ; (async () => {
        try {
          if (view !== 'week') { setDayBadges(Array.from({ length: 7 }, () => [])); return }
          const calToFeder = Object.fromEntries(allAvailableCalendars.map(c => [c.id, c.feder_id]).filter(([_, v]) => !!v))
          const selectedFederIds = new Set(selectedCalIds.map(id => calToFeder[id]).filter(Boolean))
          const ov = await federsApi.overview({ start: range.from, end: range.to })
          const items = ov?.rows || ov?.dias || ov?.items || []
          const byDay = Array.from({ length: 7 }, () => [])
          items.forEach(it => {
            const fid = it.feder_id ?? it.federId ?? it.id_feder
            if (selectedFederIds.size && !selectedFederIds.has(fid)) return
            const dateStr = it.date ?? it.fecha ?? it.dia ?? it.day
            if (!dateStr) return
            const d = new Date(dateStr + 'T00:00:00')
            const idx = (d.getDay() + 6) % 7
            const modo = String(it.modo ?? it.modalidad ?? it.modalidad_codigo ?? '').toLowerCase()
            let label = it.label ?? it.nombre ?? ''
            if (!label) label = modo.includes('pres') ? 'Presencial' : (modo.includes('rem') ? 'Remoto' : '')
            if (!label) return
            const color = modo.includes('pres') ? '#3fbf6b' : (modo.includes('rem') ? '#3ba3ff' : '#888')
            byDay[idx].push({ label, color })
          })
          if (alive) setDayBadges(byDay)
        } catch { if (alive) setDayBadges(Array.from({ length: 7 }, () => [])) }
      })()
    return () => { alive = false }
  }, [view, range.from, range.to, calList, selectedCalIds])

  // Open Day — usando ref para leer SIEMPRE el último allRows
  const openDay = useCallback((dateStr) => {
    const rows = allRowsRef.current
    const dayStart = new Date(`${dateStr}T00:00:00`)
    const dayEnd = new Date(`${dateStr}T23:59:59.999`)
    const dayItems = rows.filter(e => {
      const s = new Date((e.starts_at || '').toString().replace(' ', 'T'))
      const ee = e.ends_at
        ? new Date((e.ends_at || '').toString().replace(' ', 'T'))
        : (e.all_day ? new Date(dayEnd) : s)
      return (s <= dayEnd) && (ee >= dayStart)
    })

    modal.open({
      title: new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      width: 760,
      render: (close) => (
        <DayDetails
          date={dateStr}
          items={dayItems}
          canUpdate={canUpdate}
          canDelete={canDelete}
          onEdit={(row) => openEdit(row, close)}
          onDelete={async (id) => {
            await calendarioApi.events.delete(id)
            setLocalRows(ls => ls.filter(x => x.id !== id))
            refetchEvents?.()
            close(true)
          }}
          federById={federById}
          onNew={() => { close(false); openNew(dateStr) }}
        />
      )
    })
  }, [canUpdate, canDelete, federById, refetchEvents])

  const openEdit = (row, parentClose) => {
    modal.open({
      title: 'Editar evento',
      width: 760,
      render: (c2) => (
        <EventForm
          mode="edit"
          init={row}
          calendars={allAvailableCalendars}
          onCancel={() => c2(false)}
          onDeleted={() => {
            setLocalRows(ls => ls.filter(x => x.id !== row.id))
            refetchEvents?.()
            c2(true); parentClose?.(true)
          }}
          onSaved={(upd) => {
            setLocalRows(ls => {
              const m = new Map();[...ls, upd].forEach(x => m.set(x.id, x)); return [...m.values()]
            })
            refetchEvents?.()
            c2(true); parentClose?.(true)
          }}
        />
      )
    })
  }

  // crear nuevo (desde botón o drag)
  const openNew = (dateStr, startsAt = null, endsAt = null) => {
    const base = startsAt && endsAt
      ? { starts_at: startsAt, ends_at: endsAt, all_day: false }
      : { starts_at: (dateStr || isoDate(new Date())) + 'T09:00:00', ends_at: (dateStr || isoDate(new Date())) + 'T10:00:00', all_day: false }

    const personal = myCals.find(c => c.tipo?.codigo === 'personal' || c.tipo_codigo === 'personal')
    const calId = personal?.id || myCals[0]?.id || null
    const init = calId ? { ...base, calendario_local_id: calId } : base

    modal.open({
      title: 'Nuevo evento',
      width: 760,
      render: (close) => (
        <EventForm
          mode="create"
          init={init}
          calendars={allAvailableCalendars}
          onCancel={() => close(false)}
          onSaved={(row) => {
            setLocalRows(ls => [row, ...ls])
            refetchEvents?.()
            close(true)
            const d = new Date((row.starts_at || '').toString().replace(' ', 'T'))
            const ds = `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`
            // Abrimos con la versión que SIEMPRE lee la última lista
            setTimeout(() => openDay(ds), 0)
          }}
        />
      )
    })
  }

  const onCreateFromDrag = useCallback(({ starts_at, ends_at }) => {
    if (canCreate) openNew(null, starts_at, ends_at)
  }, [canCreate]) // estable

  const nav = {
    prev: () => view === 'week' ? setWeekStart(d => addDays(d, -7)) : board.prev(),
    next: () => view === 'week' ? setWeekStart(d => addDays(d, 7)) : board.next(),
    today: () => { if (view === 'week') setWeekStart(startOfWeek(new Date())); board.today() }
  }

  const tYear = view === 'week' ? weekStart.getFullYear() : board.year
  const tMonth = view === 'week' ? weekStart.getMonth() : board.monthIdx

  return (
    <div className="cal-board">
      <CalendarToolbar
        view={view}
        onViewChange={setView}
        year={tYear}
        monthIdx={tMonth}
        onPrev={nav.prev}
        onNext={nav.next}
        onToday={nav.today}
        setMonthIdx={(m) => view === 'week' ? setWeekStart(d => new Date(d.getFullYear(), m, 1)) : board.setMonthIdx(m)}
        calendars={allAvailableCalendars}
        federById={federById}
        selectedIds={selectedCalIds}
        onToggleCal={(id) => {
          setSelectedCalIds(ids => {
            return ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]
          })
        }}
        bottomRightSlot={<>
          <GoogleConnect onChanged={refetchEvents} />
          {canCreate && <button className="fh-btn primary" onClick={() => openNew(isoDate(new Date()))}>Nuevo evento</button>}
        </>}
      />

      {view === 'month' ? (
        <MonthGrid
          year={board.year}
          month={board.monthIdx}
          events={allRows}
          onDayClick={openDay}
          onEventClick={(ev) => openEdit(ev)}
        />
      ) : (
        <WeekGrid
          anchor={weekStart}
          events={allRows}
          dayBadges={dayBadges}
          onCreateRange={onCreateFromDrag}
          onDayClick={openDay}
          onEventClick={(ev) => openEdit(ev)}
        />
      )}
    </div>
  )
}
