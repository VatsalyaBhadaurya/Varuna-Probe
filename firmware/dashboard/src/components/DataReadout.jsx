import { COLORS } from '../constants'

function Cell({ label, value, unit, anomaly }) {
  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      justifyContent:'center',
      padding:       '0 16px',
      borderRight:   `1px solid ${COLORS.navyLight}`,
      minWidth:      '96px',
      flex:          '1 1 0',
    }}>
      <span style={{
        fontSize:      '9px',
        color:         '#6A8E9E',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom:  '4px',
      }}>
        {label}
      </span>
      <span style={{
        fontSize:   '22px',
        fontFamily: 'monospace',
        color:      anomaly ? COLORS.amber : '#A8D4E8',
        fontWeight: anomaly ? 700 : 600,
        lineHeight: 1,
      }}>
        {value ?? '--'}
        {unit && (
          <span style={{ fontSize: '11px', color: '#5A7E8E', marginLeft: '3px' }}>
            {unit}
          </span>
        )}
      </span>
      {anomaly && (
        <span style={{ fontSize: '8px', color: COLORS.amber, marginTop: '3px', letterSpacing: '0.08em' }}>
          ANOMALY
        </span>
      )}
    </div>
  )
}

function Divider({ label }) {
  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      justifyContent:'center',
      padding:       '0 8px',
      borderRight:   `1px solid ${COLORS.navyLight}`,
      color:         '#3A6070',
      fontSize:      '8px',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      flexShrink:    0,
    }}>
      {label}
    </div>
  )
}

const fmt  = (v, d = 1) => v != null ? v.toFixed(d) : null
const fmtI = (v)        => v != null ? String(v)     : null

export default function DataReadout({ currentData }) {
  const d = currentData

  const distVal = d?.distanceMM != null && d.distanceMM >= 0
    ? fmtI(d.distanceMM) : 'OOR'
  const distUnit = d?.distanceMM != null && d.distanceMM >= 0 ? 'mm' : null

  return (
    <div style={{
      background:   COLORS.navyDark,
      color:        COLORS.white,
      display:      'flex',
      alignItems:   'stretch',
      justifyContent:'flex-start',
      height:       '80px',
      borderTop:    `2px solid ${COLORS.navy}`,
      overflowX:    'auto',
      flexShrink:   0,
    }}>
      {/* Strip label */}
      <div style={{
        display:       'flex',
        alignItems:    'center',
        padding:       '0 14px',
        borderRight:   `1px solid ${COLORS.navyLight}`,
        fontSize:      '10px',
        fontWeight:    700,
        color:         '#6A8E9E',
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
        whiteSpace:    'nowrap',
        flexShrink:    0,
      }}>
        Live Values
      </div>

      <Divider label="Hall" />
      <Cell label="Raw ADC"    value={fmtI(d?.hall)}       unit="cnt"  />
      <Cell label="Deviation"  value={fmtI(d?.deviation)}  unit="cnt"  anomaly={d?.metalDetected} />
      <Cell label="Metal Det." value={d != null ? (d.metalDetected ? 'YES' : 'NO') : null} anomaly={d?.metalDetected} />

      <Divider label="Accel" />
      <Cell label="Ax" value={fmt(d?.ax, 3)} unit="m/s²" />
      <Cell label="Ay" value={fmt(d?.ay, 3)} unit="m/s²" />
      <Cell label="Az" value={fmt(d?.az, 3)} unit="m/s²" />

      <Divider label="ToF" />
      <Cell label="Distance" value={distVal} unit={distUnit} />

      <Divider label="Inference" />
      <Cell label="Nodule Cov." value={fmt(d?.nodulesPercent)} unit="%" />
      <Cell label="Avg Size"    value={fmt(d?.avgNoduleSize)}  unit="cm" />
      <Cell label="Sulphide"    value={d != null ? (d.sulphideAnomaly ? 'ALERT' : 'CLEAR') : null} anomaly={d?.sulphideAnomaly} />
    </div>
  )
}
