// src/components/tasks/priority-utils.js
export function getPriorityMeta(prioridadNum=0, vencimientoISO=null){
  const base =
      prioridadNum >= 600 ? 3 :
      prioridadNum >= 450 ? 2 :
      prioridadNum >= 300 ? 1 : 0; // 0..3

  let boost = 0;
  if (vencimientoISO) {
    const due = new Date(vencimientoISO);
    const days = Math.floor((due - new Date()) / 86400000);
    if (days < 0) boost += 2;
    else if (days <= 2) boost += 1;
    else if (days >= 15) boost -= 1;
  }

  const level = Math.max(0, Math.min(3, base + boost));
  const map = [
    { key:'low',  label:'Baja',     class:'prio--low'  },
    { key:'med',  label:'Media',    class:'prio--med'  },
    { key:'high', label:'Alta',     class:'prio--high' },
    { key:'crit', label:'Crítica',  class:'prio--crit' }
  ];
  return { level, ...map[level] };
}
