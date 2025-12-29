// src/hooks/useAttendanceStatus.js
import { useState, useEffect, useCallback, useRef } from 'react'
import { asistenciaApi } from '../api/asistencia'

// Global cache shared across all hook instances
const cache = new Map()
const CACHE_TTL_MS = 10000 // 10 seconds cache validity
const POLL_MS = 15000 // Refresh every 15 seconds

let lastFetchTime = 0

/**
 * Hook to fetch and cache attendance status for a list of feder_ids
 * @param {number[]} federIds - Array of feder IDs to check status for
 * @returns {Object} Map of feder_id -> { modalidad_codigo: 'oficina'|'remoto' } | null
 */
export default function useAttendanceStatus(federIds = []) {
    const [statuses, setStatuses] = useState({})
    const [loading, setLoading] = useState(false)
    const pollRef = useRef(null)

    // Dedupe and filter valid IDs
    const uniqueIds = [...new Set(federIds.filter(id => id && Number.isInteger(Number(id))).map(Number))]
    const idsKey = uniqueIds.sort((a, b) => a - b).join(',')

    const fetchStatuses = useCallback(async (force = false) => {
        if (!uniqueIds.length) {
            setStatuses({})
            return
        }

        const now = Date.now()

        // Check if we can use cached data
        if (!force && (now - lastFetchTime) < CACHE_TTL_MS) {
            const cachedResult = {}
            let allCached = true
            for (const id of uniqueIds) {
                if (cache.has(id)) {
                    cachedResult[id] = cache.get(id)
                } else {
                    allCached = false
                    break
                }
            }
            if (allCached) {
                setStatuses(cachedResult)
                return
            }
        }

        // Find IDs not in cache or stale
        const idsToFetch = uniqueIds.filter(id => !cache.has(id) || force)

        if (idsToFetch.length === 0) {
            // All in cache
            const result = {}
            for (const id of uniqueIds) {
                result[id] = cache.get(id) || null
            }
            setStatuses(result)
            return
        }

        setLoading(true)
        try {
            const data = await asistenciaApi.bulkStatus(idsToFetch)
            lastFetchTime = Date.now()

            // Update cache with results
            for (const id of idsToFetch) {
                const status = data[id] || data[String(id)] || null
                cache.set(id, status)
                cache.set(String(id), status)
            }

            // Build final result
            const result = {}
            for (const id of uniqueIds) {
                result[id] = cache.get(id) || null
            }
            setStatuses(result)
        } catch (err) {
            console.error('[useAttendanceStatus] Error fetching statuses:', err)
        } finally {
            setLoading(false)
        }
    }, [idsKey])

    useEffect(() => {
        fetchStatuses()

        // Set up polling
        pollRef.current = setInterval(() => fetchStatuses(true), POLL_MS)

        return () => {
            if (pollRef.current) clearInterval(pollRef.current)
        }
    }, [fetchStatuses])

    return { statuses, loading, refresh: () => fetchStatuses(true) }
}

/**
 * Utility function to get modalidad from the statuses object
 * @param {Object} statuses - The statuses object from the hook
 * @param {number} federId - The feder ID to look up
 * @returns {string|null} 'oficina' | 'remoto' | null (null means offline)
 */
export function getModalidad(statuses, federId) {
    return statuses?.[federId]?.modalidad_codigo || null
}
