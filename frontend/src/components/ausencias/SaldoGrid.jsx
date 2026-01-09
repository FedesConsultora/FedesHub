// /src/components/ausencias/SaldoGrid.jsx

import { FaUmbrellaBeach, FaBalanceScale, FaGraduationCap, FaHouseUser } from 'react-icons/fa'
import { IoRainyOutline } from "react-icons/io5";
import { TbCoinOff } from "react-icons/tb";

import GlobalLoader from '../loader/GlobalLoader.jsx'
import './SaldoGrid.scss'

const iconFor = (codigo = '', nombre = '') => {
  const normalize = (str) =>
    (str || '').toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const c = normalize(codigo);
  const n = normalize(nombre);

  // Mapeo exacto por CÓDIGO de backend
  if (c === 'vacaciones') return <FaUmbrellaBeach />
  if (c === 'tristeza') return <IoRainyOutline />
  if (c === 'examen') return <FaGraduationCap />
  if (c === 'personal') return <FaHouseUser />
  if (c === 'no_pagado') return <TbCoinOff />
  if (c === 'compensatorio' || c === 'comp') return <FaBalanceScale />

  // Fallback por keywords si el código no coincide
  const text = `${c} ${n}`;
  if (/vaca|playa|beach|descans/.test(text)) return <FaUmbrellaBeach />
  if (/lluvia|rain|triste/.test(text)) return <IoRainyOutline />
  if (/examen|estud|gradu/.test(text)) return <FaGraduationCap />
  if (/personal|famil|hogar|mudanza/.test(text)) return <FaHouseUser />
  if (/pagado|pago|sueldo|moneda/.test(text)) return <TbCoinOff />
  if (/balanc|ajust|comp/.test(text)) return <FaBalanceScale />

  return <FaUmbrellaBeach />
}
const fmt = (n, unit) => unit === 'hora' ? Number(n || 0).toFixed(0) : Number(n || 0).toFixed(1)

export default function SaldoGrid({ breakdown = [], loading = false }) {
  return (
    <div className="aus-saldos" style={{ position: 'relative', minHeight: loading ? 100 : 0 }}>
      {loading && <GlobalLoader size={60} />}
      {!loading && breakdown.map(t => (
        <div key={t.tipo_id} className="fh-card aus-saldo">
          <div className="icon">{iconFor(t.tipo_codigo, t.tipo_nombre)}</div>
          <div className="title">{t.tipo_nombre}</div>
          <div className="main">
            {fmt(t.available, t.unidad_codigo)} <span className="unit">{t.unidad_codigo === 'hora' ? 'h' : 'd'}</span>
          </div>
          <div className="muted">DISPONIBLE</div>
          <div className="grid">
            <label>Asignado</label><span>{fmt(t.allocated, t.unidad_codigo)}</span>
            <label>Aprobado</label><span>{fmt(t.approved, t.unidad_codigo)}</span>
            <label>Planificado</label><span>{fmt(t.planned, t.unidad_codigo)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
