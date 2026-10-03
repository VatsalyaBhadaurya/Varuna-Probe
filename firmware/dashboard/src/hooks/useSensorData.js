import { useState, useEffect, useRef } from 'react'
import { DEMO_MODE, HALL_THRESHOLD, POLL_INTERVAL_MS, HISTORY_LEN } from '../constants'

// ── Demo data generator — produces a plausible sensor walk ──────────────────
function generateDemoPoint(prev) {
  const t   = Date.now()
  const sin = Math.sin(t / 8000)
  const r   = () => (Math.random() - 0.5)

  const ax  = prev ? prev.ax * 0.92 + r() * 0.15 : r() * 0.2
  const ay  = prev ? prev.ay * 0.92 + r() * 0.15 : r() * 0.2
  const az  = prev ? prev.az * 0.95 + (-9.81 + r() * 0.4) * 0.05 : -9.81 + r() * 0.3

  const deviation = Math.max(0, Math.round(
    (prev?.deviation ?? 12) + r() * 10 + sin * 5
  ))
  const metalDetected = deviation > HALL_THRESHOLD

  const distanceMM = Math.round(240 + sin * 90 + r() * 25)

  const nodulesPercent = Math.max(0, Math.min(100,
    (prev?.nodulesPercent ?? 28) + r() * 1.2 + Math.sin(t / 30000) * 0.4
  ))
  const avgNoduleSize = Math.max(0.5, Math.min(25,
    (prev?.avgNoduleSize ?? 8.4) + r() * 0.25
  ))
  const sulphideAnomaly = Math.random() < 0.025

  return {
    hall: 2048 + Math.round(r() * 180),
    deviation,
    metalDetected,
    ax: +ax.toFixed(4),
    ay: +ay.toFixed(4),
    az: +az.toFixed(4),
    distanceMM,
    nodulesPercent: +nodulesPercent.toFixed(2),
    avgNoduleSize:  +avgNoduleSize.toFixed(2),
    sulphideAnomaly,
    timestamp: t,
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export default function useSensorData() {
  const [currentData, setCurrentData] = useState(null)
  const [history,     setHistory]     = useState([])
  const [status,      setStatus]      = useState(DEMO_MODE ? 'DEMO' : 'OFFLINE')
  const prevRef = useRef(null)

  useEffect(() => {
    const poll = async () => {
      if (DEMO_MODE) {
        const point = generateDemoPoint(prevRef.current)
        prevRef.current = point
        const ts = new Date().toLocaleTimeString('en-IN', { hour12: false })
        setCurrentData(point)
        setHistory(h => [...h.slice(-(HISTORY_LEN - 1)), { ts, ...point }])
        setStatus('DEMO')
        return
      }

      // ── Live path ──────────────────────────────────────────────────────────
      try {
        const res = await fetch('/api/sensors', {
          signal: AbortSignal.timeout(900),
          cache: 'no-store',
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()

        let inference = {}
        try {
          const inf = await fetch('/api/inference', {
            signal: AbortSignal.timeout(400),
            cache: 'no-store',
          })
          if (inf.ok) inference = await inf.json()
        } catch { /* inference is optional */ }

        const merged = {
          ...data,
          nodulesPercent:  inference.nodulesPercent  ?? null,
          avgNoduleSize:   inference.avgNoduleSize   ?? null,
          sulphideAnomaly: inference.sulphideAnomaly ?? false,
        }

        setCurrentData(merged)
        setStatus('LIVE')
        setHistory(h => {
          const ts = new Date().toLocaleTimeString('en-IN', { hour12: false })
          return [...h.slice(-(HISTORY_LEN - 1)), {
            ts,
            ...merged,
            distanceMM: merged.distanceMM >= 0 ? merged.distanceMM : null,
          }]
        })
      } catch {
        setStatus('OFFLINE')
      }
    }

    poll()
    const id = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  return { currentData, history, status }
}
