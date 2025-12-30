// src/components/tasks/priority-utils.js
export function getPriorityMeta(prioridadNum = 0, boostManual = 0, vencimientoISO = null) {
  const p = Number(prioridadNum) || 0;
  const b = Number(boostManual) > 0 ? 250 : 0; // El rayito ahora suma 250 puntos fijos

  let score = p + b;

  // Presión por vencimiento - mucho más suave para no "incendiar" el tablero
  if (vencimientoISO) {
    const due = new Date(vencimientoISO);
    const now = new Date();
    const diff = due - now;
    if (diff < 0) {
      score += 40; // Tarea vencida suma 40 puntos
    } else {
      const days = Math.floor(diff / 86400000);
      if (days <= 1) score += 15; // Hoy/Mañana suma 15
    }
  }

  /**
   * NUEVOS UMBRALES EXQUISITOS:
   * Tipo A(50) + Impacto(30) + Vencida(40) = 120. (Debe ser NARANJA)
   * 
   * Score < 55: Baja (Verde) - Tipo B tranquilo (30), Tipo C con impacto (10+30)
   * Score 55 - 130: Media (Naranja) - Tipo A con impacto (50+30), Tipo B vencido
   * Score 130 - 300: Alta (Rojo) - REQUIERE RAYITO generalmente
   * Score > 300: Crítica (Púrpura) - REQUIERE RAYITO + IMPORTANCIA
   */
  let level = 0;
  if (score >= 300) level = 3;      // Crítica (Púrpura)
  else if (score >= 130) level = 2; // Alta (Rojo)
  else if (score >= 55) level = 1;  // Media (Naranja)
  else level = 0;                  // Baja (Verde)

  // REGLA DE ORO 1: Crítica (Púrpura) SOLO con rayito
  if (level === 3 && Number(boostManual) === 0) {
    level = 2;
  }

  // REGLA DE ORO 2: Si hay rayito, mínimo es Alta (Rojo)
  if (Number(boostManual) > 0 && level < 2) {
    level = 2;
  }

  const map = [
    { key: 'low', label: 'Baja', class: 'prio--low', color: '#4caf50' }, // Verde
    { key: 'med', label: 'Media', class: 'prio--med', color: '#fb8c00' }, // Naranja
    { key: 'high', label: 'Alta', class: 'prio--high', color: '#f44336' }, // Rojo
    { key: 'crit', label: 'Crítica', class: 'prio--crit', color: '#9c27b0' }  // Púrpura
  ];

  return {
    level,
    ...map[level],
    isBoosted: Number(boostManual) > 0
  };
}
