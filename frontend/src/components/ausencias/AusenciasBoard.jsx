// src/components/ausencias/AusenciasBoard.jsx
import { useMemo, useState, useCallback } from 'react'
import usePermission from '../../hooks/usePermissions'
import { useAusenciasBoard, normalizeAmount } from '../../hooks/useAusencias'
import useFeders from '../../hooks/useFeders'          // 🆕
import AusenciasToolbar from './AusenciasToolbar'
import SaldoGrid from './SaldoGrid'
import YearCalendar from './YearCalendar'
import MonthCalendar from './MonthCalendar'
import CalendarLegend from './CalendarLegend'
import AbsenceForm from './dialogs/AbsenceForm'
import AllocationForm from './dialogs/AllocationForm'
import AusenciasFilters from './AusenciasFilters'
import DayDetails from './dialogs/DayDetails'
import { useModal } from '../modal/ModalProvider.jsx'
import './AusenciasBoard.scss'

const WORKDAY_HOURS = Number(import.meta.env.VITE_WORKDAY_HOURS || 8)
const two = (n)=>String(n).padStart(2,'0')
const todayLocal = ()=>{
  const d = new Date()
  return `${d.getFullYear()}-${two(d.getMonth()+1)}-${two(d.getDate())}`
}

// Expande cada ausencia por todo su rango [desde..hasta] (inclusive)
function mapByDateFromRows(rows){
  const m = new Map()
  for (const r of rows){
    let d = new Date(r.fecha_desde + 'T00:00:00')
    const end = new Date(r.fecha_hasta + 'T00:00:00')
    while (d <= end){
      const key = `${d.getFullYear()}-${two(d.getMonth()+1)}-${two(d.getDate())}`
      const arr = m.get(key) || []
      arr.push(r)
      m.set(key, arr)
      d = new Date(d.getTime() + 86400000)
    }
  }
  return m
}

export default function AusenciasBoard() {
  const now = new Date()
  const modal = useModal()

  const [year, setYear] = useState(now.getFullYear())
  const [monthIdx, setMonthIdx] = useState(now.getMonth())
  const [view, setView] = useState('year')

  // Filtros
  const [filters, setFilters] = useState({
    tipoId: '',
    estados: new Set(['aprobada','pendiente','denegada','cancelada']),
    futureOnly: false
  })

  const { can } = usePermission()
  const canCreate  = can('ausencias','create')
  const canApprove = can('ausencias','approve')
  const canAssign  = can('ausencias','assign')
  const canRequestAllocation = canCreate || canAssign

  const board = useAusenciasBoard(String(year))

  // 🆕 catálogo de personas para mostrar solicitante en el modal
  const { rows: feders } = useFeders({ limit: 200, is_activo: 'true' })
  const federById = useMemo(() => Object.fromEntries(feders.map(f => [f.id, f])), [feders])

  // 🆕 inyecciones locales (muestran inmediatamente lo recién creado / actualizado)
  const [localRows, setLocalRows] = useState([]) // elementos {id,...} que recién se crean/actualizan

  // merge (board + locales) y deduplicar por id
  const allRows = useMemo(() => {
    const map = new Map()
    ;[...board.aus.rows, ...localRows].forEach(r => map.set(r.id, r))
    return Array.from(map.values())
  }, [board.aus.rows, localRows])

  // ---- cards de saldo
  const breakdown = useMemo(() => {
    const map = new Map()
    for (const s of board.saldos.saldos) {
      map.set(s.tipo_id, {
        tipo_id: s.tipo_id,
        tipo_codigo: s.tipo_codigo,
        tipo_nombre: s.tipo_nombre,
        unidad_codigo: s.unidad_codigo,
        allocated: Number(s.asignado || 0),
        consumido: Number(s.consumido || 0),
        available: Number(s.disponible || 0),
        approved: 0,
        planned: 0,
      })
    }
    const today = todayLocal()
    for (const row of allRows) {
      const b = map.get(row.tipo_id) || {
        tipo_id: row.tipo_id, tipo_codigo: row.tipo_codigo, tipo_nombre: row.tipo_nombre,
        unidad_codigo: row.unidad_codigo, allocated: 0, consumido: 0, available: 0, approved: 0, planned: 0
      }
      const amt = normalizeAmount(row, WORKDAY_HOURS)
      const val = b.unidad_codigo==='hora' ? amt.horas : amt.dias
      if (row.estado_codigo === 'aprobada') b.approved += val
      else if (row.estado_codigo === 'pendiente' && row.fecha_desde >= today) b.planned += val
      map.set(row.tipo_id, b)
    }
    return Array.from(map.values()).sort((a,b) => a.tipo_nombre.localeCompare(b.tipo_nombre))
  }, [board.saldos.saldos, allRows])

  // ---- filtros
  const todayISO = todayLocal()
  const match = useCallback((r) => {
    if (filters.tipoId && r.tipo_id !== Number(filters.tipoId)) return false
    if (filters.estados.size && !filters.estados.has(r.estado_codigo)) return false
    if (filters.futureOnly && (r.fecha_hasta < todayISO)) return false
    return true
  }, [filters, todayISO])

  const filteredRows = useMemo(() => allRows.filter(match), [allRows, match])

  // mapa expandido por día
  const filteredByDate = useMemo(() => mapByDateFromRows(filteredRows), [filteredRows])

  const pendingVisible = useMemo(
    () => filteredRows.filter(r => r.estado_codigo === 'pendiente').length,
    [filteredRows]
  )

  // ---- abrir formularios con el Provider
  const openNewAbs = (dateStr=null) => {
    modal.open({
      title: 'Nueva ausencia',
      width: 720,
      render: (close) => (
        <AbsenceForm
          onCancel={()=>close(false)}
          onCreated={(row)=>{
            // inyecto localmente para ver al instante
            setLocalRows(ls => [{...row}, ...ls])
            close(true)
            // abro detalle del día recién creado
            setTimeout(()=>openDay(row.fecha_desde),0)
          }}
          initDate={dateStr}
          tipos={board.saldos.tipos}
          saldos={board.saldos.saldos}
          canApprove={canApprove}
        />
      )
    })
  }

  const openNewAlloc = () => {
    modal.open({
      title: 'Nueva asignación (solicitud)',
      width: 720,
      render: (close) => (
        <AllocationForm onCancel={()=>close(false)} onDone={()=>close(true)} />
      )
    })
  }

  // cuando alguien aprueba/rechaza en el modal, actualizo estado local
  const onRowChanged = (updated) => {
    setLocalRows(ls => {
      const map = new Map()
      ;[...ls, updated].forEach(r => map.set(r.id, r))
      return Array.from(map.values())
    })
  }

  // ---- detalle del día
  const openDay = (dateStr) => {
    const items = filteredByDate.get(dateStr) || []
    modal.open({
      title: new Date(dateStr+'T00:00:00').toLocaleDateString(undefined, { weekday:'long', day:'numeric', month:'long', year:'numeric' }),
      width: 720,
      render: (close) => (
        <DayDetails
          date={dateStr}
          items={items}
          canApprove={canApprove}
          federById={federById}          // 🆕 datos del solicitante
          onUpdated={onRowChanged}       // 🆕 refresco local
          onNew={()=>{ close(false); openNewAbs(dateStr) }}
        />
      )
    })
  }

  return (
    <div className="aus-board">
      <AusenciasToolbar
        year={year}
        monthIdx={monthIdx}
        onPrev={() => { if (view==='year') setYear(y=>y-1); else setMonthIdx(m => (m+11)%12) }}
        onToday={() => { setYear(now.getFullYear()); setMonthIdx(now.getMonth()) }}
        onNext={() => { if (view==='year') setYear(y=>y+1); else setMonthIdx(m => (m+1)%12) }}
        onYearChange={setYear}
        view={view}
        setView={setView}
        canCreate={canCreate}
        canAssign={canRequestAllocation}
        onNewAbs={() => openNewAbs()}
        onNewAlloc={openNewAlloc}
        pendingBadge={canApprove ? pendingVisible : 0}
      />

      <SaldoGrid breakdown={breakdown} loading={board.saldos.loading} />

      <AusenciasFilters
        tipos={board.saldos.tipos}
        value={filters}
        onChange={setFilters}
      />

      <div className="aus-cal">
        {view === 'year' ? (
          <YearCalendar
            year={year}
            monthIdx={board.monthIdx}
            setMonthIdx={board.setMonthIdx}
            byDate={filteredByDate}
            onDayClick={openDay}
          />
        ) : (
          <MonthCalendar
            year={year}
            month={monthIdx}
            rows={filteredRows}
            onDayClick={openDay}
          />
        )}
        <CalendarLegend />
      </div>
    </div>
  )
}