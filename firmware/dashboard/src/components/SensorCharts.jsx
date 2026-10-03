import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Label,
} from 'recharts'
import { COLORS, HALL_THRESHOLD } from '../constants'

// ── Shared axis / grid styles ────────────────────────────────────────────
const TICK_STYLE = { fontSize: 9, fill: COLORS.midGray }

const TOOLTIP_PROPS = {
  contentStyle: {
    background: COLORS.white,
    border:     `1px solid ${COLORS.border}`,
    fontSize:   '11px',
    padding:    '4px 8px',
    borderRadius: 0,
  },
  labelStyle:   { color: COLORS.midGray, fontSize: '10px', marginBottom: '2px' },
  itemStyle:    { color: COLORS.darkGray },
}

// ── Compact panel wrapper for one chart ──────────────────────────────────
function ChartPanel({ title, unitLabel, anomaly, children }) {
  const bg      = anomaly ? '#2A1400' : COLORS.navyDark
  const titleCl = anomaly ? COLORS.amber : COLORS.white

  return (
    <div style={{
      flex:    1,
      display: 'flex',
      flexDirection: 'column',
      borderBottom: `1px solid ${COLORS.border}`,
      minHeight: 0,
    }}>
      <div style={{
        background:    bg,
        color:         titleCl,
        padding:       '5px 12px',
        fontSize:      '10px',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        display:       'flex',
        justifyContent:'space-between',
        alignItems:    'center',
        flexShrink:    0,
      }}>
        <span>{anomaly ? `⚠ ${title}` : title}</span>
        <span style={{ fontFamily: 'monospace', color: anomaly ? COLORS.amber : '#7A9EAE', fontSize: '9px' }}>
          {unitLabel}
        </span>
      </div>

      {/* Absolute wrapper makes height: 100% reliable inside flex */}
      <div style={{ flex: 1, position: 'relative', minHeight: '100px' }}>
        <div style={{ position: 'absolute', inset: 0, padding: '2px 0' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Chart 1: Hall effect deviation with threshold ────────────────────────
function HallChart({ history, anomaly }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={history} margin={{ top: 4, right: 10, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="2 4" stroke={COLORS.gridLine} vertical={false} />
        <XAxis
          dataKey="ts"
          tick={TICK_STYLE}
          interval="preserveStartEnd"
          tickLine={false}
          axisLine={{ stroke: COLORS.border }}
        />
        <YAxis
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={false}
          width={44}
        >
          <Label
            value="ADC cnt"
            angle={-90}
            position="insideLeft"
            style={{ fontSize: 8, fill: COLORS.lightGray }}
            offset={10}
          />
        </YAxis>
        <Tooltip {...TOOLTIP_PROPS} formatter={(v) => [`${v} cnt`, 'Deviation']} />
        <ReferenceLine
          y={HALL_THRESHOLD}
          stroke={COLORS.amber}
          strokeDasharray="5 3"
          strokeWidth={1}
          label={{ value: `Threshold (${HALL_THRESHOLD})`, position: 'insideTopRight', fontSize: 8, fill: COLORS.amber, offset: 4 }}
        />
        <Line
          type="monotone"
          dataKey="deviation"
          stroke={anomaly ? COLORS.amber : COLORS.navy}
          dot={false}
          strokeWidth={1.5}
          isAnimationActive={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Chart 2: ToF distance ────────────────────────────────────────────────
function ToFChart({ history }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={history} margin={{ top: 4, right: 10, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="2 4" stroke={COLORS.gridLine} vertical={false} />
        <XAxis
          dataKey="ts"
          tick={TICK_STYLE}
          interval="preserveStartEnd"
          tickLine={false}
          axisLine={{ stroke: COLORS.border }}
        />
        <YAxis
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={false}
          width={44}
          domain={['auto', 'auto']}
        >
          <Label
            value="mm"
            angle={-90}
            position="insideLeft"
            style={{ fontSize: 8, fill: COLORS.lightGray }}
            offset={10}
          />
        </YAxis>
        <Tooltip {...TOOLTIP_PROPS} formatter={(v) => v != null ? [`${v} mm`, 'Distance'] : ['—', 'Distance']} />
        <Line
          type="monotone"
          dataKey="distanceMM"
          stroke={COLORS.navy}
          dot={false}
          strokeWidth={1.5}
          isAnimationActive={false}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Chart 3: Nodule coverage % ───────────────────────────────────────────
function NoduleChart({ history, anomaly }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={history} margin={{ top: 4, right: 10, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="2 4" stroke={COLORS.gridLine} vertical={false} />
        <XAxis
          dataKey="ts"
          tick={TICK_STYLE}
          interval="preserveStartEnd"
          tickLine={false}
          axisLine={{ stroke: COLORS.border }}
        />
        <YAxis
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={false}
          width={44}
          domain={[0, 100]}
        >
          <Label
            value="%"
            angle={-90}
            position="insideLeft"
            style={{ fontSize: 8, fill: COLORS.lightGray }}
            offset={10}
          />
        </YAxis>
        <Tooltip {...TOOLTIP_PROPS} formatter={(v) => v != null ? [`${v.toFixed(1)} %`, 'Coverage'] : ['—', 'Coverage']} />
        <Line
          type="monotone"
          dataKey="nodulesPercent"
          stroke={anomaly ? COLORS.amber : COLORS.navy}
          dot={false}
          strokeWidth={1.5}
          isAnimationActive={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Exported panel ───────────────────────────────────────────────────────
export default function SensorCharts({ history, currentData }) {
  const hallAnomaly     = currentData?.metalDetected   ?? false
  const sulphideAnomaly = currentData?.sulphideAnomaly ?? false

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Panel header */}
      <div style={{
        background:    COLORS.navyDark,
        color:         COLORS.white,
        padding:       '5px 12px',
        fontSize:      '10px',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        flexShrink:    0,
        borderBottom:  `1px solid ${COLORS.border}`,
      }}>
        Sensor Time Series
      </div>

      <ChartPanel title="Hall Effect Deviation" unitLabel="ADC counts" anomaly={hallAnomaly}>
        <HallChart history={history} anomaly={hallAnomaly} />
      </ChartPanel>

      <ChartPanel title="Time-of-Flight Distance" unitLabel="millimetres">
        <ToFChart history={history} />
      </ChartPanel>

      <ChartPanel title="Nodule Coverage Estimate" unitLabel="percent" anomaly={sulphideAnomaly}>
        <NoduleChart history={history} anomaly={sulphideAnomaly} />
      </ChartPanel>
    </div>
  )
}
