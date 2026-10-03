import { useEffect, useState } from 'react'
import { COLORS } from '../constants'

const STATUS_CFG = {
  LIVE:    { color: '#2E8B57', label: '● LIVE' },
  DEMO:    { color: '#D4881A', label: '◆ DEMO' },
  OFFLINE: { color: '#C0392B', label: '○ OFFLINE' },
}

const SEP = {
  borderRight: `1px solid ${COLORS.navyLight}`,
  paddingRight: '16px',
  marginRight: '16px',
}

function MetaCell({ sub, main, mono = false, align = 'left' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align === 'right' ? 'flex-end' : 'flex-start' }}>
      <span style={{ fontSize: '9px', color: '#7A9EAE', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1px' }}>
        {sub}
      </span>
      <span style={{ fontSize: '12px', fontFamily: mono ? 'monospace' : 'inherit', letterSpacing: mono ? '0.06em' : '0.03em', fontWeight: 600 }}>
        {main}
      </span>
    </div>
  )
}

export default function Header({ status }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const cfg = STATUS_CFG[status] ?? STATUS_CFG.OFFLINE

  return (
    <header style={{
      background:    COLORS.navy,
      color:         COLORS.white,
      display:       'flex',
      alignItems:    'center',
      padding:       '0 16px',
      height:        '52px',
      borderBottom:  `2px solid ${COLORS.navyDark}`,
      flexShrink:    0,
      gap:           0,
      userSelect:    'none',
    }}>
      {/* Logo */}
      <img
        src="/image.png"
        alt="VARUNA sensor pod"
        style={{
          height:       '36px',
          width:        '36px',
          objectFit:    'cover',
          borderRadius: '4px',
          marginRight:  '12px',
          border:       `1px solid ${COLORS.navyLight}`,
          flexShrink:   0,
        }}
      />

      {/* Ministry / org */}
      <div style={{ ...SEP, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '9px', color: '#7A9EAE', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Ministry of Earth Sciences · NIOT / SIH-2026
        </span>
        <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em' }}>
          VARUNA · SEAFLOOR MINERAL SURVEY
        </span>
      </div>

      {/* Instrument ID */}
      <div style={{ ...SEP }}>
        <MetaCell sub="Instrument ID" main="SIH-MES-2026/FS-001" mono />
      </div>

      {/* Deployment */}
      <div style={{ ...SEP }}>
        <MetaCell sub="Deployment" main="PS-SIH26-RUN-1" mono />
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: '9px', color: '#7A9EAE', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1px' }}>
            Status
          </span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: cfg.color, letterSpacing: '0.08em', fontFamily: 'monospace' }}>
            {cfg.label}
          </span>
        </div>

        <MetaCell
          sub="Local Time (IST)"
          main={now.toLocaleTimeString('en-IN', { hour12: false })}
          mono align="right"
        />

        <MetaCell
          sub="Date"
          main={now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          mono align="right"
        />
      </div>
    </header>
  )
}
