import { useEffect, useState } from 'react'

export default function useMedia(query, defaultState = false) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return defaultState
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = (e) => setMatches(e.matches)
    mql.addEventListener?.('change', onChange)
    return () => mql.removeEventListener?.('change', onChange)
  }, [query])

  return matches
}