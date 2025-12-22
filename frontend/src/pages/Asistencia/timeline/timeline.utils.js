export const groupByFederAndDay = (items) => {
  const map = {}

  items.forEach(r => {
    if (!r?.check_in_at) return

    const day = r.check_in_at.slice(0, 10)
    const federKey = r.feder_id

    if (!map[federKey]) {
      map[federKey] = {
        feder_id: r.feder_id,
        nombre: `${r.apellido} ${r.nombre}`,
        days: {}
      }
    }

    if (!map[federKey].days[day]) {
      map[federKey].days[day] = {
        date: day,
        minutes: 0,
        registros: []
      }
    }

    const start = new Date(r.check_in_at)
    const end = r.check_out_at
      ? new Date(r.check_out_at)
      : new Date()

    map[federKey].days[day].minutes +=
      (end - start) / 60000

    map[federKey].days[day].registros.push(r)
  })

  return Object.values(map)
}
