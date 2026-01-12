import { useEffect, useRef, useState } from 'react'
import { FaHome, FaBuilding, FaPlay, FaStop } from 'react-icons/fa'
import useAsistencia, { fmtHM, fmtHMS } from '../../hooks/useAsistencia'
import './AsistenciaDot.scss'

export default function AsistenciaDot() {
  const { isOpen, fmtElapsed, todayMinutes, todaySeconds, checkInHome, checkInOficina, checkOut, refresh } = useAsistencia(20000)

  const btnRef = useRef(null)
  const [openPop, setOpenPop] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    const popWidth = 340
    const margin = 10
    let left = r.left + r.width / 2

    // Clamp
    const minLeft = (popWidth / 2) + margin
    const maxLeft = window.innerWidth - (popWidth / 2) - margin
    left = Math.max(minLeft, Math.min(left, maxLeft))

    setPos({ top: r.bottom + 10, left })
  }

  const togglePop = () => {
    if (!openPop) place()
    setOpenPop(v => !v)
  }

  // cerrar al hacer click afuera o ESC
  useEffect(() => {
    if (!openPop) return
    const onClick = (e) => {
      if (btnRef.current?.contains(e.target)) return
      const p = document.querySelector('.asisPop')
      if (p && p.contains(e.target)) return
      setOpenPop(false)
    }
    const onEsc = (e) => { if (e.key === 'Escape') setOpenPop(false) }
    window.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onEsc)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onEsc)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [openPop])

  const onInHome = async () => { await checkInHome(); setOpenPop(false) }
  const onInOfi = async () => { await checkInOficina(); setOpenPop(false) }
  const onOut = async () => { await checkOut(); setOpenPop(false) }

  return (
    <>
      <button
        ref={btnRef}
        className={'asisDotBtn ' + (isOpen ? 'on' : 'off')}
        title={isOpen ? 'Asistencia en curso' : 'Sin asistencia en curso'}
        aria-label="Asistencia"
        onClick={togglePop}
      />
      {openPop && (
        <div
          className="asisPop"
          style={{ top: `${pos.top}px`, left: `${pos.left}px` }}
          role="dialog"
          aria-modal="true"
        >
          {!isOpen ? (
            <>
              <div className="popTitle">Elegí modalidad</div>
              <div className="modGrid">
                <button className="modCard" onClick={onInOfi}>
                  <FaBuilding className="ic" aria-hidden />
                  <div className="txt">
                    <div className="name">Presencial</div>
                    <div className="sub">Oficina</div>
                  </div>
                  <FaPlay className="cta" aria-hidden />
                </button>
                <button className="modCard" onClick={onInHome}>
                  <FaHome className="ic" aria-hidden />
                  <div className="txt">
                    <div className="name">Home</div>
                    <div className="sub">Remoto</div>
                  </div>
                  <FaPlay className="cta" aria-hidden />
                </button>
              </div>
              <div className="foot">
                <span>Hoy: {fmtHMS(todaySeconds)}</span>
                <button className="link" onClick={refresh}>Actualizar</button>
              </div>
            </>
          ) : (
            <>
              <div className="popTitle">Asistencia en curso</div>
              <div className="elapsed">{fmtElapsed}</div>
              <button className="bigDanger" onClick={onOut}>
                <FaStop aria-hidden /> Registrar salida
              </button>
              <div className="foot">
                <span>Hoy: {fmtHM(todayMinutes)} h</span>
                <button className="link" onClick={refresh}>Actualizar</button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
