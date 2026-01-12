// src/pages/asistencia/AsistenciaPage.jsx
import { useEffect, useState } from 'react'
import usePermission from '../../hooks/usePermissions'
import { asistenciaApi } from '../../api/asistencia'
import TimelineDay from './timeline/TimelineDay'
import TimelineWeek from './timeline/TimelineWeek'
import TimelineMonth from './timeline/TimelineMonth'

import { GrNext, GrPrevious } from "react-icons/gr";
import { FiCalendar, FiSearch } from 'react-icons/fi'

import './timeline/timeline.scss'

const getRange = (isoDate, view) => {
  const d = new Date(isoDate)

  if (view === 'day') return null


  if (view === 'week') {
    const day = d.getDay() || 7
    const monday = new Date(d)
    monday.setDate(d.getDate() - (day - 1))

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    return {
      from: monday.toISOString().slice(0, 10),
      to: sunday.toISOString().slice(0, 10),
    }
  }

  if (view === 'month') {
    const first = new Date(d.getFullYear(), d.getMonth(), 1)
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)

    return {
      from: first.toISOString().slice(0, 10),
      to: last.toISOString().slice(0, 10),
    }
  }
}

export default function AsistenciaPage() {
  const { can } = usePermission()
  const canReport = can('asistencia', 'report')
  const [tab, setTab] = useState(canReport ? 'equipo' : 'mi')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [q, setQ] = useState('')
  const [view, setView] = useState(() => localStorage.getItem('asst-view') || 'day');
  const TODAY = new Date().toISOString().slice(0, 10)

  // Persistir la vista seleccionada
  useEffect(() => {
    localStorage.setItem('asst-view', view)
  }, [view])


  const addByView = (isoDate, delta, view) => {
    const d = new Date(isoDate)

    if (view === 'day') d.setDate(d.getDate() + delta)
    if (view === 'week') d.setDate(d.getDate() + delta * 7)
    if (view === 'month') d.setMonth(d.getMonth() + delta)

    return d.toISOString().slice(0, 10)
  }

  const goPrevDay = () => setFecha(f => addByView(f, -1, view))
  const goNextDay = () => setFecha(f => addByView(f, 1, view))
  const goToday = () => setFecha(TODAY)




  useEffect(() => {
    if (!canReport && tab === 'equipo') setTab('mi')
  }, [canReport, tab])

  return (
    <div className="asst-page">
      <div className="asst-head">
        <div className="asst-head-top">
          <h1 className="ttl">Asistencia</h1>
          <div className="grow" />
          <div className="asst-nav-controls">
            <button
              type="button"
              className="fh-btn nav-btn"
              onClick={goPrevDay}
              title="Anterior"
            >
              <GrPrevious />
            </button>
            <button
              type="button"
              className="fh-btn fh-btn-today"
              onClick={goToday}
              disabled={fecha === TODAY}
            >
              Hoy
            </button>
            <button
              type="button"
              className="fh-btn nav-btn"
              onClick={goNextDay}
              title="Siguiente"
            >
              <GrNext />
            </button>
          </div>
        </div>

        <div className="asst-head-bottom">
          {canReport && tab === 'equipo' && (
            <div className="search-box">
              <FiSearch className="search-icon" />
              <input
                className="fh-input"
                placeholder="Buscar persona…"
                value={q}
                onChange={e => setQ(e.target.value)}
              />
            </div>
          )}

          <div className="date-picker-box">
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="fh-input" />
          </div>

          <div className="view-picker-box">
            <select
              className="fh-input asst-view-select"
              value={view}
              onChange={e => setView(e.target.value)}
            >
              <option value="day">Día</option>
              <option value="week">Semana</option>
              <option value="month">Mes</option>
            </select>
          </div>
        </div>
      </div>

      {canReport && (
        <div className="asst-tabs">
          <button className={`tab ${tab === 'mi' ? 'active' : ''}`} onClick={() => setTab('mi')}>
            Mi asistencia
          </button>
          <button className={`tab ${tab === 'equipo' ? 'active' : ''}`} onClick={() => setTab('equipo')}>
            Equipo
          </button>
        </div>
      )}

      <div className="asst-content">
        {tab === 'mi' && <TimelineWrapper view={view}
          fecha={fecha} scope="me" onNavigate={(f, v) => { setFecha(f); setView(v); }} />}
        {tab === 'equipo' && canReport && <TimelineWrapper view={view} fecha={fecha} scope="global" q={q} onNavigate={(f, v) => { setFecha(f); setView(v); }} />}
      </div>
    </div>
  )
}

import { useLoading } from '../../context/LoadingContext.jsx'

function TimelineWrapper({ fecha, scope, q = '', view, onNavigate }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { showLoader, hideLoader } = useLoading()

  useEffect(() => {
    let alive = true;
    let loaderActive = false;

    const startLoading = () => {
      if (!loaderActive) {
        showLoader();
        loaderActive = true;
      }
    };

    const stopLoading = () => {
      if (loaderActive) {
        hideLoader();
        loaderActive = false;
      }
    };

    const fetch = async (isFirst = false) => {
      if (!alive) return;

      if (isFirst) {
        setLoading(true);
        startLoading();
      }
      setError(null);

      try {
        const range = view === 'day' ? null : getRange(fecha, view);
        const fn = view === 'day'
          ? (scope === 'me' ? asistenciaApi.me.timelineDia : asistenciaApi.timelineDia)
          : (scope === 'me' ? asistenciaApi.me.timelineRango : asistenciaApi.timelineRango);

        const params = view === 'day'
          ? { fecha }
          : { desde: range.from, hasta: range.to, q };

        if (typeof fn !== 'function') {
          throw new Error('Vista no disponible aún');
        }

        const d = await fn(params);
        if (!alive) return;

        if (Array.isArray(d)) {
          setData({ items: d });
        } else {
          setData(d);
        }
      } catch (e) {
        if (!alive) return;
        const status = e?.response?.status;
        const msg = e?.response?.data?.message || e.message;
        setError(status ? `${status} · ${msg}` : msg);
      } finally {
        if (isFirst) {
          if (alive) setLoading(false);
          stopLoading();
        }
      }
    };

    fetch(true);
    const poll = setInterval(() => fetch(false), 30000);

    return () => {
      alive = false;
      clearInterval(poll);
      stopLoading();
    };
  }, [fecha, scope, q, view, showLoader, hideLoader]);

  if (loading && !data) return null
  if (error) return <div className="fh-err">{error}</div>
  if (!data?.items?.length) {
    return (
      <div className="asst-empty-state">
        <div className="empty-icon-box">
          <FiCalendar />
        </div>
        <h3>Sin registros</h3>
        <p>No se encontraron datos de asistencia para esta fecha.</p>
        <button className="fh-btn" onClick={() => onNavigate(new Date().toISOString().slice(0, 10), view)}>
          Volver a hoy
        </button>
      </div>
    )
  }

  if (view === 'day') {
    return <TimelineDay payload={data} startHour={5} />
  }

  if (view === 'week') {
    return <TimelineWeek payload={data} onNavigate={onNavigate} currentFecha={fecha} />
  }

  if (view === 'month') {
    return <TimelineMonth payload={data} onNavigate={onNavigate} currentFecha={fecha} />
  }

  return null
}

