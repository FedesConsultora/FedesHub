// src/components/ausencias/AusenciasBoard.jsx
import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import usePermission from '../../hooks/usePermissions'
import { useAusenciasBoard, normalizeAmount } from '../../hooks/useAusencias'
import useFeders from '../../hooks/useFeders'          // 🆕
import AusenciasToolbar from './AusenciasToolbar'
import SaldoGrid from './SaldoGrid'
import YearCalendar from './YearCalendar'
import MonthCalendar from './MonthCalendar'

import AbsenceForm from './dialogs/AbsenceForm'
import AllocationForm from './dialogs/AllocationForm'
import RrhhAusenciasTab from '../admin/AdminDrawer/RrhhAusenciasTab'
import AbsenceTypesTab from '../admin/AdminDrawer/AbsenceTypesTab'
import AusenciasFilters from './AusenciasFilters'
import DayDetails from './dialogs/DayDetails'
import MassiveAllocationForm from './dialogs/MassiveAllocationForm'
import { FaCalendarAlt } from 'react-icons/fa'
import { FiLoader, FiSettings } from 'react-icons/fi'
import { useModal } from '../modal/ModalProvider.jsx'
import './AusenciasBoard.scss'

const WORKDAY_HOURS = Number(import.meta.env.VITE_WORKDAY_HOURS || 8)
const two = (n) => String(n).padStart(2, '0')
const todayLocal = () => {
  const d = new Date()
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`
}

// Expande cada ausencia por todo su rango [desde..hasta] (inclusive)
function mapByDateFromRows(rows) {
  const m = new Map()
  for (const r of rows) {
    let d = new Date(r.fecha_desde + 'T00:00:00')
    const end = new Date(r.fecha_hasta + 'T00:00:00')
    while (d <= end) {
      const key = `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`
      const arr = m.get(key) || []
      arr.push(r)
      m.set(key, arr)
      d = new Date(d.getTime() + 86400000)
    }
  }
  return m
}

export default function AusenciasBoard() {
  const { user, roles } = useAuth()
  const now = new Date()
  const modal = useModal()

  const [year, setYear] = useState(now.getFullYear())
  const [monthIdx, setMonthIdx] = useState(now.getMonth())
  const [view, setView] = useState(window.innerWidth < 768 ? 'month' : 'year')

  // Filtros
  const [filters, setFilters] = useState({
    tipoId: '',
    estados: new Set(['aprobada', 'pendiente', 'denegada', 'cancelada']),
    futureOnly: false
  })

  const { perms, can } = usePermission()
  const canCreate = can('ausencias', 'create')
  const canApprove = can('ausencias', 'approve')
  const canAssign = can('ausencias', 'assign')
  const canManageRrhh = can('rrhh', 'manage') || can('ausencias', 'manage')

  if (import.meta.env.DEV) {
    console.log('--- AUSENCIAS PERMISSIONS DEBUG ---')
    console.log('User Perms Array:', perms)
    console.log('canManageRrhh:', canManageRrhh)
    console.log('canApprove (ausencias.approve):', canApprove)
    console.log('-----------------------------------')
  }
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

    // Debug: ver qué trae el endpoint
    if (import.meta.env.DEV && board.saldos.saldos.length > 0) {
      console.log('📊 board.saldos.saldos:', board.saldos.saldos)
    }

    for (const s of board.saldos.saldos) {
      map.set(s.tipo_id, {
        tipo_id: s.tipo_id,
        tipo_codigo: s.tipo_codigo,
        tipo_nombre: s.tipo_nombre,
        tipo_icon: s.tipo_icon,
        tipo_color: s.tipo_color,
        unidad_codigo: s.unidad_codigo,
        allocated: Number(s.asignado || 0),
        consumido: Number(s.consumido || 0),
        available: Number(s.disponible || 0),
        approved: 0,
        planned: 0,
      })
    }
    const today = todayLocal()
    // SOLO contar ausencias del usuario actual
    const myFederId = user?.feder_id

    for (const row of allRows) {
      // FILTRO CRÍTICO: Solo sumar si es mi ausencia
      if (myFederId && row.feder_id !== myFederId) continue

      const b = map.get(row.tipo_id) || {
        tipo_id: row.tipo_id, tipo_codigo: row.tipo_codigo, tipo_nombre: row.tipo_nombre,
        tipo_icon: row.tipo_icon, tipo_color: row.tipo_color,
        unidad_codigo: row.unidad_codigo, allocated: 0, consumido: 0, available: 0, approved: 0, planned: 0
      }
      const amt = normalizeAmount(row, WORKDAY_HOURS)
      const val = b.unidad_codigo === 'hora' ? amt.horas : amt.dias
      if (row.estado_codigo === 'aprobada') b.approved += val
      else if (row.estado_codigo === 'pendiente') b.planned += val
      map.set(row.tipo_id, b)
    }
    return Array.from(map.values())
      .filter(b => b.allocated > 0 || b.approved > 0 || b.planned > 0)
      .sort((a, b) => a.tipo_nombre.localeCompare(b.tipo_nombre))
  }, [board.saldos.saldos, allRows, user?.feder_id])

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

  // 🛡️ Ref para evitar cierres (closures) viejos en openDay (arregla bug de refresco tras creación)
  const filteredByDateRef = useRef(filteredByDate)
  useEffect(() => { filteredByDateRef.current = filteredByDate }, [filteredByDate])

  const pendingVisible = useMemo(
    () => filteredRows.filter(r => r.estado_codigo === 'pendiente').length,
    [filteredRows]
  )

  // ---- abrir formularios con el Provider
  const openNewAbs = (dateStr = null, initHasta = null) => {
    modal.open({
      title: 'Nueva ausencia',
      width: 720,
      render: (close) => (
        <AbsenceForm
          onCancel={() => close(false)}
          onCreated={(row) => {
            setLocalRows(ls => [{ ...row }, ...ls])
            close(true)
            setTimeout(() => openDay(row.fecha_desde), 100)
          }}
          initDate={dateStr}
          initHasta={initHasta}
          tipos={board.saldos.tipos}
          saldos={board.saldos.saldos}
          canApprove={canApprove}
        />
      )
    })
  }

  const openRangeAbs = (start, end) => {
    openNewAbs(start, end)
  }

  const openEditAbs = (item) => {
    modal.open({
      title: 'Editar ausencia',
      width: 720,
      render: (close) => (
        <AbsenceForm
          onCancel={() => close(false)}
          onCreated={(row) => {
            onRowChanged(row)
            close(true)
            setTimeout(() => openDay(row.fecha_desde), 100)
          }}
          editingItem={item}
          tipos={board.saldos.tipos}
          saldos={board.saldos.saldos}
          canApprove={canApprove}
        />
      )
    })
  }

  const openNewAlloc = (initDate = null) => {
    modal.open({
      title: 'Nueva asignación (solicitud)',
      width: 720,
      render: (close) => (
        <AllocationForm initDate={initDate} tipos={board.saldos.tipos} onCancel={() => close(false)} onDone={() => { close(true); board.fetchAll() }} />
      )
    })
  }

  const openMassiveAlloc = () => {
    modal.open({
      title: 'Asignación Masiva de Cupos',
      width: 800,
      render: (close) => (
        <MassiveAllocationForm onCancel={() => close(false)} onDone={() => { close(true); board.fetchAll() }} />
      )
    })
  }

  const openRrhhModal = () => {
    modal.open({
      title: 'Panel de RRHH - Asignación de Cupos',
      width: 1100,
      render: (close) => (
        <RrhhAusenciasTab onOpenConfig={() => { close(true); openConfigModal() }} />
      )
    })
  }

  const openConfigModal = () => {
    modal.open({
      title: 'Configuración de tipos de ausencia',
      width: 900,
      render: (close) => (
        <AbsenceTypesTab />
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
    const items = filteredByDateRef.current.get(dateStr) || []
    modal.open({
      title: new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      width: 720,
      render: (close) => (
        <DayDetails
          date={dateStr}
          items={items}
          canApprove={canApprove}
          federById={federById}
          onUpdated={onRowChanged}
          onNew={() => { close(false); openNewAbs(dateStr) }}
          onNewAlloc={() => { close(false); openNewAlloc(dateStr) }}
          onEdit={(item) => { close(false); openEditAbs(item) }}
        />
      )
    })
  }

  return (
    <div className="aus-board">
      <AusenciasToolbar
        canCreate={canCreate}
        canAssign={canRequestAllocation}
        canManageRrhh={canManageRrhh}
        onNewAbs={() => openNewAbs()}
        onNewAlloc={openNewAlloc}
        onMassiveAlloc={openMassiveAlloc}
        onOpenRrhh={openRrhhModal}
        onOpenConfig={openConfigModal}
        canManageTypes={can('ausencias', 'manage')}
        pendingBadge={(canApprove && (roles.includes('RRHH') || roles.includes('NivelA')))
          ? filteredRows.filter(r => r.estado_codigo === 'pendiente' && r.user_id !== user?.id).length
          : 0}
      />

      {board.aus.loading && (
        <div className="board-loader">
          <FiLoader className="spin" />
          <span>Cargando ausencias...</span>
        </div>
      )}

      <SaldoGrid breakdown={breakdown} loading={board.saldos.loading} />

      <AusenciasFilters
        tipos={board.saldos.tipos}
        value={filters}
        onChange={setFilters}
      />

      <div className="aus-cal">
        <div className="cal-nav">
          <div className="nav-l">
            <div className="segmented">
              <button className={`seg ${view === 'year' ? 'active' : ''}`} onClick={() => setView('year')}>Año</button>
              <button className={`seg ${view === 'month' ? 'active' : ''}`} onClick={() => setView('month')}>Mes</button>
            </div>
            {view === 'month' ? (
              <div className="pill date-picker-pill">
                <FaCalendarAlt />
                <div className="display-date">
                  {new Date(year, monthIdx, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })}
                </div>
                <input
                  type="date"
                  className="nav-date-input"
                  value={`${year}-${String(monthIdx + 1).padStart(2, '0')}-01`}
                  onChange={(e) => {
                    const d = new Date(e.target.value + 'T00:00:00');
                    if (!isNaN(d.getTime())) {
                      setYear(d.getFullYear());
                      setMonthIdx(d.getMonth());
                    }
                  }}
                />
              </div>
            ) : (
              <div className="pill status-pill">
                <FaCalendarAlt />
                <YearPicker value={year} onChange={setYear} />
              </div>
            )}
          </div>

          <div className="nav-r">
            <button className="fh-btn ghost" onClick={() => { setYear(now.getFullYear()); setMonthIdx(now.getMonth()) }}>Hoy</button>
          </div>
        </div>
        {view === 'year' ? (
          <YearCalendar
            year={year}
            monthIdx={board.monthIdx}
            setMonthIdx={board.setMonthIdx}
            byDate={filteredByDate}
            onDayClick={openDay}
            onRangeSelect={openRangeAbs}
          />
        ) : (
          <MonthCalendar
            year={year}
            month={monthIdx}
            rows={filteredRows}
            onDayClick={openDay}
            onRangeSelect={openRangeAbs}
            onPrev={() => {
              if (monthIdx === 0) { setYear(y => y - 1); setMonthIdx(11); }
              else { setMonthIdx(m => m - 1); }
            }}
            onNext={() => {
              if (monthIdx === 11) { setYear(y => y + 1); setMonthIdx(0); }
              else { setMonthIdx(m => m + 1); }
            }}
          />
        )}

      </div>
    </div>
  )
}

function YearPicker({ value, onChange }) {
  const years = []
  const base = new Date().getFullYear()
  for (let y = base - 2; y <= base + 2; y++) years.push(y)
  return (
    <select className="year-picker" value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {years.map(y => <option key={y} value={y}>{y}</option>)}
    </select>
  )
}
