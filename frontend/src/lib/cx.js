// unión de clases sin dependencias: acepta strings, arrays y objetos {clase:cond}
export function cx(...args) {
  const out = []
  for (const a of args) {
    if (!a) continue
    if (typeof a === 'string') out.push(a)
    else if (Array.isArray(a)) out.push(cx(...a))
    else if (typeof a === 'object') {
      for (const [k, v] of Object.entries(a)) if (v) out.push(k)
    }
  }
  return out.join(' ')
}
