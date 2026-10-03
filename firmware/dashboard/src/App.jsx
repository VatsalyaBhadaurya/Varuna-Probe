import Header         from './components/Header'
import OrientationModel from './components/OrientationModel'
import SensorCharts   from './components/SensorCharts'
import DataReadout    from './components/DataReadout'
import useSensorData  from './hooks/useSensorData'
import { COLORS }     from './constants'

export default function App() {
  const { currentData, history, status } = useSensorData()

  return (
    <div style={{
      background:  COLORS.offWhite,
      height:      '100vh',
      display:     'flex',
      flexDirection:'column',
      fontFamily:  '"Inter", "Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color:       COLORS.darkGray,
      fontSize:    '13px',
      overflow:    'hidden',
    }}>
      <Header status={status} currentData={currentData} />

      {/* Main two-column grid */}
      <div style={{
        flex:                1,
        display:             'grid',
        gridTemplateColumns: '1fr 400px',
        minHeight:           0,
        borderTop:           `1px solid ${COLORS.border}`,
      }}>
        {/* Left: 3D orientation */}
        <div style={{
          borderRight: `1px solid ${COLORS.border}`,
          background:  COLORS.white,
          display:     'flex',
          flexDirection:'column',
          overflow:    'hidden',
        }}>
          <OrientationModel currentData={currentData} />
        </div>

        {/* Right: time-series charts */}
        <div style={{
          background:   COLORS.white,
          display:      'flex',
          flexDirection:'column',
          overflow:     'hidden',
        }}>
          <SensorCharts history={history} currentData={currentData} />
        </div>
      </div>

      {/* Bottom: live numeric strip */}
      <DataReadout currentData={currentData} />
    </div>
  )
}
