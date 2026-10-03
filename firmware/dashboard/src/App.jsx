import Header         from './components/Header'
import OrientationModel from './components/OrientationModel'
import SensorCharts   from './components/SensorCharts'
import DataReadout    from './components/DataReadout'
import useSensorData  from './hooks/useSensorData'
import useIsMobile    from './hooks/useIsMobile'
import { COLORS }     from './constants'

export default function App() {
  const { currentData, history, status } = useSensorData()
  const isMobile = useIsMobile()

  return (
    <div style={{
      background:  COLORS.offWhite,
      height:      isMobile ? 'auto' : '100vh',
      minHeight:   '100vh',
      display:     'flex',
      flexDirection:'column',
      fontFamily:  '"Inter", "Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color:       COLORS.darkGray,
      fontSize:    '13px',
      overflow:    isMobile ? 'visible' : 'hidden',
    }}>
      <Header status={status} currentData={currentData} isMobile={isMobile} />

      {/* Main layout — stacked on mobile, two columns on desktop */}
      <div style={{
        flex:                isMobile ? 'none' : 1,
        display:             isMobile ? 'flex' : 'grid',
        flexDirection:       isMobile ? 'column' : undefined,
        gridTemplateColumns: isMobile ? undefined : '1fr 400px',
        minHeight:           0,
        borderTop:           `1px solid ${COLORS.border}`,
      }}>
        {/* 3D orientation */}
        <div style={{
          borderRight:  isMobile ? 'none' : `1px solid ${COLORS.border}`,
          borderBottom: isMobile ? `1px solid ${COLORS.border}` : 'none',
          background:   COLORS.white,
          display:      'flex',
          flexDirection:'column',
          overflow:     'hidden',
          height:       isMobile ? '320px' : 'auto',
          flexShrink:   0,
        }}>
          <OrientationModel currentData={currentData} isMobile={isMobile} />
        </div>

        {/* Time-series charts */}
        <div style={{
          background:   COLORS.white,
          display:      'flex',
          flexDirection:'column',
          overflow:     'hidden',
        }}>
          <SensorCharts history={history} currentData={currentData} isMobile={isMobile} />
        </div>
      </div>

      {/* Bottom: live numeric strip */}
      <DataReadout currentData={currentData} />
    </div>
  )
}
