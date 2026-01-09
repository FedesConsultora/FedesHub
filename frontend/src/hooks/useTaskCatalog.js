import { useEffect, useState } from 'react'
import { tareasApi } from '../api/tareas'

/**
 * Hook que trae los catálogos necesarios para el form de creación.
 * Tolerante al shape: intenta mapear claves comunes.
 */
export default function useTaskCatalog() {
  const [data, setData] = useState({ clientes: [], hitos: [], impactos: [], urgencias: [], etiquetas: [], feders: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
      ; (async () => {
        try {
          setLoading(true)
          const cat = await tareasApi.catalog()

          const pick = (obj, keys) => keys.find(k => Array.isArray(obj?.[k])) || null

          const clientesKey = pick(cat, ['clientes', 'Clients', 'Clientes', 'cliente', 'Cliente'])
          const hitosKey = pick(cat, ['hitos', 'clienteHitos', 'ClienteHitos', 'hitosCliente'])
          const impactosKey = pick(cat, ['impactos', 'impactoTipos', 'ImpactoTipo', 'impacto_tipos'])
          const urgenciasKey = pick(cat, ['urgencias', 'urgenciaTipos', 'UrgenciaTipo', 'urgencia_tipos'])
          const etiquetasKey = pick(cat, ['etiquetas', 'tareaEtiquetas', 'TareaEtiqueta'])
          const federsKey = pick(cat, ['feders', 'feder', 'asignables', 'personas', 'usuarios', 'users'])

          // TC
          const tcRedesKey = pick(cat, ['tc_redes'])
          const tcFormatosKey = pick(cat, ['tc_formatos'])
          const tcObjNegKey = pick(cat, ['tc_obj_negocio'])
          const tcObjMktKey = pick(cat, ['tc_obj_marketing'])
          const tcEstPubKey = pick(cat, ['tc_estados_pub'])

          const mapped = {
            clientes: cat[clientesKey] || [],
            hitos: cat[hitosKey] || [],
            impactos: cat[impactosKey] || [],
            urgencias: cat[urgenciasKey] || [],
            etiquetas: cat[etiquetasKey] || [],
            feders: cat[federsKey] || [],
            // TC
            tc_redes: cat[tcRedesKey] || [],
            tc_formatos: cat[tcFormatosKey] || [],
            tc_obj_negocio: cat[tcObjNegKey] || [],
            tc_obj_marketing: cat[tcObjMktKey] || [],
            tc_estados_pub: cat[tcEstPubKey] || []
          }

          if (alive) setData(mapped)
        } catch (e) {
          if (alive) setError(e)
        } finally {
          if (alive) setLoading(false)
        }
      })()
    return () => { alive = false }
  }, [])

  return { data, loading, error }
}
