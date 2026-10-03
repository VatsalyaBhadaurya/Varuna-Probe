import { COLORS } from '../constants'

// Equirectangular projection on a 360×180 viewBox:
//   x = lon + 180 ,  y = 90 - lat
const pts = (coords) => coords.map(([lon, lat]) => `${lon + 180},${90 - lat}`).join(' ')

// Simplified continent silhouettes ([lon, lat] outlines) — recognisable at inset size.
const CONTINENTS = [
  // North America
  [[-168,65],[-156,71],[-130,70],[-100,72],[-85,70],[-60,83],[-75,68],[-78,62],[-64,60],
   [-56,52],[-66,48],[-70,43],[-74,40],[-81,25],[-90,29],[-97,26],[-105,22],[-114,30],
   [-124,40],[-124,48],[-135,58],[-150,59],[-165,60]],
  // South America
  [[-81,8],[-70,12],[-60,10],[-50,0],[-44,-3],[-35,-6],[-38,-13],[-48,-25],[-58,-35],
   [-65,-42],[-71,-52],[-75,-50],[-71,-37],[-70,-20],[-76,-14],[-81,-6]],
  // Eurasia + Africa (one mass, split by the Red Sea gap is ignored for the inset)
  [[-10,36],[-9,44],[0,49],[2,51],[-4,58],[6,62],[12,65],[28,71],[40,68],[55,70],[70,73],
   [100,78],[140,73],[160,70],[170,67],[160,60],[140,50],[130,43],[122,40],[122,30],
   [110,21],[105,10],[100,8],[95,16],[90,22],[80,8],[77,8],[85,20],[72,20],[65,25],[57,25],
   [48,30],[43,40],[36,36],[28,36],[18,40],[8,38],[-2,36]],
  // Africa
  [[-17,15],[-16,21],[-10,30],[0,37],[11,37],[25,32],[34,31],[43,12],[51,12],[42,-2],
   [40,-15],[35,-22],[26,-34],[20,-35],[18,-28],[12,-17],[9,-1],[2,5],[-8,4],[-13,8]],
  // Australia
  [[114,-22],[122,-18],[130,-12],[137,-12],[142,-11],[146,-18],[150,-25],[153,-28],
   [149,-37],[140,-38],[130,-32],[123,-34],[115,-34]],
]

// Deployment site — Central Indian Ocean Basin (polymetallic nodule field)
const SITE = { lon: 76, lat: -12 }
const siteX = SITE.lon + 180
const siteY = 90 - SITE.lat

export default function WorldMapInset() {
  return (
    <div style={{
      position:   'absolute',
      bottom:     '8px',
      left:       '8px',
      width:      '196px',
      background: 'rgba(6, 32, 48, 0.88)',
      border:     `1px solid ${COLORS.navyLight}`,
      padding:    '6px 7px 5px',
      pointerEvents: 'none',
      fontFamily: 'monospace',
    }}>
      <div style={{ color: '#7A9EAE', fontSize: '8px', letterSpacing: '0.12em', marginBottom: '4px' }}>
        DEPLOYMENT LOCATION
      </div>

      <svg viewBox="0 0 360 180" width="182" height="91" style={{ display: 'block' }}>
        <rect x="0" y="0" width="360" height="180" fill="#07293B" />

        {/* Graticule */}
        <g stroke="#17455E" strokeWidth="0.6">
          {[30, 60, 90, 120, 150].map((y) => <line key={`h${y}`} x1="0" y1={y} x2="360" y2={y} />)}
          {[60, 120, 180, 240, 300].map((x) => <line key={`v${x}`} x1={x} y1="0" x2={x} y2="180" />)}
        </g>

        {/* Continents */}
        {CONTINENTS.map((c, i) => (
          <polygon key={i} points={pts(c)} fill="#2E6E8E" stroke="#4A90AE" strokeWidth="0.5" />
        ))}

        {/* Site crosshair + pulsing marker */}
        <g>
          <line x1={siteX} y1={siteY - 14} x2={siteX} y2={siteY + 14} stroke={COLORS.amber} strokeWidth="0.8" />
          <line x1={siteX - 14} y1={siteY} x2={siteX + 14} y2={siteY} stroke={COLORS.amber} strokeWidth="0.8" />
          <circle cx={siteX} cy={siteY} r="8" fill="none" stroke={COLORS.amber} strokeWidth="0.8" opacity="0.5">
            <animate attributeName="r" values="4;11;4" dur="2.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0;0.7" dur="2.2s" repeatCount="indefinite" />
          </circle>
          <circle cx={siteX} cy={siteY} r="3" fill={COLORS.amber} />
        </g>
      </svg>

      <div style={{ color: '#A8D4E8', fontSize: '8px', marginTop: '4px', letterSpacing: '0.04em' }}>
        12.0°S · 76.0°E · CIOB
      </div>
    </div>
  )
}
