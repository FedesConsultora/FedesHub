import { useEffect, useState, useCallback } from 'react'
import { listCargosOverview } from '../api/cargos'

export default function useCargosOverview() {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const refresh = useCallback(async () => {
        try {
            setLoading(true); setError(null)
            const res = await listCargosOverview()
            setData(res.data || [])
        } catch (e) {
            setError(e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        refresh()
    }, [refresh])

    return { data, loading, error, refresh }
}
