import { Suspense, useRef, useMemo, useEffect, useState, Component } from 'react'
import { Canvas, useLoader, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { STLLoader } from 'three-stdlib'
import * as THREE from 'three'
import { COLORS, TILT_THRESHOLD_DEG } from '../constants'
import { computePitchRoll, radToDeg } from '../utils/orientation'
import WorldMapInset from './WorldMapInset'

const SEABED_Y = -1.9          // world-Y of the mean seabed surface
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// Shared seabed height field — used by the terrain and to seat deposits on it
const noise = (x, z) =>
  Math.sin(x * 0.55) * 0.20 +
  Math.cos(z * 0.48) * 0.17 +
  Math.sin((x + z) * 0.9) * 0.08 +
  Math.abs((Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1) * 0.14
const terrainY = (x, z) => SEABED_Y + noise(x, z)

// Deposit palette (shared with the legend overlay)
const DEPOSITS = {
  nodule:   '#26251F',
  sulphide: '#1C1A18',
  cobalt:   '#39454E',
  ree:      '#9A6B34',
}

// ── Error boundary: catches STL load failures ─────────────────────────────
class ModelErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(err) { return { error: err } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '24px', color: '#C0392B', fontFamily: 'monospace', fontSize: '11px', background: '#FFF8F5' }}>
          <div style={{ marginBottom: '6px', fontWeight: 700 }}>STL LOAD ERROR</div>
          <div>{this.state.error.message}</div>
          <div style={{ marginTop: '8px', color: COLORS.midGray, fontSize: '10px' }}>
            Ensure public/ANANTA_VARUNA_prototype_1to1.stl is present and the dev server is running.
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Wireframe box shown while STL is loading ─────────────────────────────
function LoadingPlaceholder() {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.4
  })
  return (
    <mesh ref={ref}>
      <boxGeometry args={[1.4, 1.4, 1.4]} />
      <meshBasicMaterial color="#1A5276" wireframe />
    </mesh>
  )
}

// ── Probe rig: WASD movement + data-driven height + ambient bob + tilt ─────
function ProbeRig({ pitchTarget, rollTarget, anomaly, distanceMM }) {
  const groupRef = useRef()   // position: WASD + height + ambient
  const meshRef  = useRef()   // attitude (pitch/roll)
  const beamRef  = useRef()   // ToF measurement beam
  const hitRef   = useRef()   // beam contact spot on seabed
  const geometry = useLoader(STLLoader, `${import.meta.env.BASE_URL}ANANTA_VARUNA_prototype_1to1.stl`)

  const [scale, setScale] = useState(1)
  const halfH = useRef(1.1)             // pod half-height after scaling

  useEffect(() => {
    if (!geometry) return
    geometry.center()
    geometry.computeBoundingBox()
    const size = new THREE.Vector3()
    geometry.boundingBox.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    const s = maxDim > 0 ? 2.6 / maxDim : 1
    setScale(s)
    halfH.current = (size.y * s) / 2
  }, [geometry])

  // Target hover height from the ToF distance (farther reading → higher pod)
  const targetY = useMemo(() => {
    const norm = clamp(((distanceMM ?? 240) - 100) / 300, 0, 1)
    return 1.1 + norm * 1.1            // height above local seabed
  }, [distanceMM])

  useFrame(({ clock }) => {
    const g = groupRef.current, m = meshRef.current
    if (!g || !m) return
    const t = clock.elapsedTime

    // Gentle ambient bob so it never looks frozen (small + slow = stable)
    const bob = Math.sin(t * 0.7) * 0.03
    const groundY = terrainY(0, 0)
    g.position.y += (groundY + targetY + bob - g.position.y) * 0.04

    // Attitude from accelerometer (smoothed)
    m.rotation.x += (pitchTarget - m.rotation.x) * 0.08
    m.rotation.z += (rollTarget  - m.rotation.z) * 0.08

    // ToF beam: pod underside → seabed directly below
    const floor = terrainY(0, 0)
    const top   = g.position.y - halfH.current + 0.1
    const len   = Math.max(0.05, top - floor)
    if (beamRef.current) {
      beamRef.current.scale.y    = len
      beamRef.current.position.set(0, (top + floor) / 2, 0)
    }
    if (hitRef.current) {
      hitRef.current.position.set(0, floor + 0.02, 0)
      hitRef.current.material.opacity = 0.35 + Math.sin(t * 4) * 0.2
    }
  })

  const beamColor = anomaly ? COLORS.amber : '#C0392B'

  return (
    <>
      <group ref={groupRef} position={[0, SEABED_Y + targetY, 0]}>
        <mesh ref={meshRef} geometry={geometry} scale={scale}>
          <meshStandardMaterial
            color={anomaly ? '#A06010' : '#2A6E96'}
            emissive={anomaly ? '#3A1800' : '#000000'}
            roughness={0.55}
            metalness={0.35}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* ToF measurement beam */}
      <mesh ref={beamRef}>
        <cylinderGeometry args={[0.012, 0.012, 1, 8]} />
        <meshBasicMaterial color={beamColor} transparent opacity={0.55} />
      </mesh>

      {/* Beam contact spot on the seabed */}
      <mesh ref={hitRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.14, 24]} />
        <meshBasicMaterial color={beamColor} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}

// ── Uneven seabed terrain (displaced plane) ───────────────────────────────
function Seabed() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(18, 18, 72, 72)
    g.rotateX(-Math.PI / 2)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) p.setY(i, noise(p.getX(i), p.getZ(i)))
    g.computeVertexNormals()
    return g
  }, [])

  return (
    <group position={[0, SEABED_Y, 0]}>
      <mesh geometry={geo} receiveShadow>
        <meshStandardMaterial color="#B9B1A1" roughness={0.95} metalness={0.02} flatShading />
      </mesh>
      <mesh geometry={geo}>
        <meshBasicMaterial color="#8A8275" wireframe transparent opacity={0.18} />
      </mesh>
    </group>
  )
}

// ── Water body: volume resting on the seabed + animated surface ────────────
const WATER_TOP = 3.6
function Water() {
  const ref = useRef()
  const geo = useMemo(() => new THREE.PlaneGeometry(60, 60, 40, 40), [])
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    const p = ref.current.geometry.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i)
      p.setZ(i, Math.sin(x * 0.3 + t) * 0.18 + Math.cos(y * 0.3 + t * 0.8) * 0.18)
    }
    p.needsUpdate = true
  })

  const height = WATER_TOP - SEABED_Y
  return (
    <group>
      {/* Translucent water volume sitting on the seabed (inner faces) */}
      <mesh position={[0, (WATER_TOP + SEABED_Y) / 2, 0]}>
        <boxGeometry args={[60, height, 60]} />
        <meshStandardMaterial
          color="#1C7FB0" transparent opacity={0.18} side={THREE.BackSide}
          depthWrite={false} roughness={0.3} metalness={0.1}
        />
      </mesh>
      {/* Rippling surface at the top of the water body */}
      <mesh ref={ref} geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, WATER_TOP, 0]}>
        <meshStandardMaterial
          color="#1C7FB0" transparent opacity={0.4} side={THREE.DoubleSide}
          roughness={0.25} metalness={0.15}
        />
      </mesh>
    </group>
  )
}

// ── Polymetallic nodules: dark manganese lumps scattered on the floor ──────
function Nodules({ count = 150 }) {
  const ref = useRef()
  const data = useMemo(() => {
    const a = []
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 16
      const z = (Math.random() - 0.5) * 16
      const s = 0.05 + Math.random() * 0.08
      a.push({ x, y: terrainY(x, z) + s * 0.4, z, s })
    }
    return a
  }, [count])
  useEffect(() => {
    const d = new THREE.Object3D()
    data.forEach((n, i) => {
      d.position.set(n.x, n.y, n.z)
      d.scale.set(n.s, n.s * 0.6, n.s)
      d.rotation.set(0, Math.random() * Math.PI, 0)
      d.updateMatrix()
      ref.current.setMatrixAt(i, d.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [data])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, data.length]}>
      <sphereGeometry args={[1, 10, 10]} />
      <meshStandardMaterial color={DEPOSITS.nodule} roughness={0.6} metalness={0.5} />
    </instancedMesh>
  )
}

// ── Hydrothermal sulphide chimneys (black smokers) with plumes ─────────────
function Sulphides() {
  const spots = [[3, -2], [-4, 1], [5, 4], [-5, -4]]
  const plumeRefs = useRef([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    plumeRefs.current.forEach((p, i) => {
      if (p) p.scale.y = 1 + Math.sin(t * 1.5 + i) * 0.12
    })
  })
  return (
    <>
      {spots.map(([x, z], i) => {
        const y = terrainY(x, z)
        return (
          <group key={i} position={[x, y, z]}>
            <mesh position={[0, 0.3, 0]}>
              <cylinderGeometry args={[0.07, 0.18, 0.6, 10]} />
              <meshStandardMaterial color={DEPOSITS.sulphide} emissive="#1A0600" roughness={0.9} metalness={0.3} />
            </mesh>
            <mesh
              ref={(el) => (plumeRefs.current[i] = el)}
              position={[0, 0.9, 0]}
            >
              <coneGeometry args={[0.14, 0.7, 10, 1, true]} />
              <meshBasicMaterial color="#2A2622" transparent opacity={0.25} side={THREE.DoubleSide} />
            </mesh>
          </group>
        )
      })}
    </>
  )
}

// ── Cobalt-rich crusts: dark steel slabs on raised outcrops ────────────────
function CobaltCrusts() {
  const spots = [[2, 3], [-3, -2], [4, -3], [-2, 4], [1, -5], [-5, 3]]
  return (
    <>
      {spots.map(([x, z], i) => (
        <mesh key={i} position={[x, terrainY(x, z) + 0.03, z]} rotation={[0, i, 0]}>
          <cylinderGeometry args={[0.45, 0.5, 0.08, 6]} />
          <meshStandardMaterial color={DEPOSITS.cobalt} roughness={0.5} metalness={0.7} />
        </mesh>
      ))}
    </>
  )
}

// ── Rare-earth-element-bearing sediment patches (ochre) ────────────────────
function REESediments() {
  const spots = [[-1, 2], [3, 0], [-3, -5], [0, 5], [5, -1]]
  return (
    <>
      {spots.map(([x, z], i) => (
        <mesh key={i} position={[x, terrainY(x, z) + 0.015, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.5 + (i % 3) * 0.15, 20]} />
          <meshStandardMaterial color={DEPOSITS.ree} roughness={1} metalness={0.05} transparent opacity={0.85} />
        </mesh>
      ))}
    </>
  )
}

// ── Axes helper (small, in corner) ───────────────────────────────────────
function AxesHelper() {
  const axes = useMemo(() => new THREE.AxesHelper(0.7), [])
  return <primitive object={axes} position={[-6.5, SEABED_Y + 0.1, -6.5]} />
}

// ── Deposit legend overlay ─────────────────────────────────────────────────
function DepositLegend() {
  const items = [
    ['Polymetallic nodules',  DEPOSITS.nodule],
    ['Hydrothermal sulphides', DEPOSITS.sulphide],
    ['Cobalt-rich crusts',     DEPOSITS.cobalt],
    ['REE-bearing sediments',  DEPOSITS.ree],
  ]
  return (
    <div style={{
      position:   'absolute',
      top:        '10px',
      right:      '10px',
      background: 'rgba(6, 32, 48, 0.9)',
      border:     `1px solid ${COLORS.navyLight}`,
      padding:    '12px 16px',
      fontFamily: 'monospace',
      pointerEvents: 'none',
      minWidth:   '230px',
    }}>
      <div style={{ color: '#7A9EAE', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', marginBottom: '10px' }}>
        SEABED DEPOSITS
      </div>
      {items.map(([label, color]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span style={{ width: '16px', height: '16px', background: color, border: '1px solid #4A6E7E', flexShrink: 0 }} />
          <span style={{ color: '#A8D4E8', fontSize: '12px' }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Exported component ────────────────────────────────────────────────────
export default function OrientationModel({ currentData, isMobile }) {
  const { pitch, roll } = computePitchRoll(
    currentData?.ax, currentData?.ay, currentData?.az
  )

  const pitchDeg = radToDeg(pitch)
  const rollDeg  = radToDeg(roll)
  const tiltOK   = Math.abs(pitchDeg) <= TILT_THRESHOLD_DEG &&
                   Math.abs(rollDeg)  <= TILT_THRESHOLD_DEG

  const distanceMM = currentData?.distanceMM != null && currentData.distanceMM >= 0
    ? currentData.distanceMM : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Sub-header */}
      <div style={{
        background:   COLORS.navyDark,
        color:        COLORS.white,
        padding:      '5px 12px',
        fontSize:     '10px',
        letterSpacing:'0.1em',
        textTransform:'uppercase',
        display:      'flex',
        justifyContent:'space-between',
        alignItems:   'center',
        flexShrink:   0,
        borderBottom: `1px solid ${COLORS.border}`,
      }}>
        <span>Seabed Survey · Probe Attitude &amp; Altitude</span>
        <span style={{ fontFamily: 'monospace', color: '#7A9EAE', fontSize: '9px' }}>
          drag to orbit · scroll to zoom
        </span>
      </div>

      {/* Canvas wrapper */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <ModelErrorBoundary>
          <Canvas
            camera={{ position: [0, 1.6, 6.2], fov: 44, near: 0.01, far: 500 }}
            style={{ width: '100%', height: '100%' }}
          >
            <color attach="background" args={['#E6EAEA']} />
            <fog attach="fog" args={['#DCE6EA', 10, 26]} />

            {/* Lighting — directional, no decorative glow */}
            <ambientLight intensity={0.55} />
            <directionalLight position={[6, 10, 6]}  intensity={1.1} />
            <directionalLight position={[-4, 4, -6]} intensity={0.3} color="#8BAFC0" />

            <Seabed />
            <Nodules />
            <Sulphides />
            <CobaltCrusts />
            <REESediments />
            <Water />
            <AxesHelper />

            <Suspense fallback={<LoadingPlaceholder />}>
              <ProbeRig
                pitchTarget={pitch}
                rollTarget={roll}
                anomaly={!tiltOK}
                distanceMM={distanceMM}
              />
            </Suspense>

            <OrbitControls
              makeDefault
              enablePan={false}
              minDistance={2.5}
              maxDistance={18}
              maxPolarAngle={Math.PI / 2 - 0.02}
              enableDamping
              dampingFactor={0.06}
            />
          </Canvas>
        </ModelErrorBoundary>

        {/* Attitude readout overlay */}
        <div style={{
          position:   'absolute',
          top:        '8px',
          left:       '8px',
          background: 'rgba(6, 32, 48, 0.88)',
          color:      COLORS.white,
          padding:    '8px 12px',
          fontSize:   '11px',
          fontFamily: 'monospace',
          lineHeight: '1.75',
          border:     `1px solid ${COLORS.navyLight}`,
          pointerEvents: 'none',
          minWidth:   '148px',
        }}>
          <div style={{ color: '#7A9EAE', fontSize: '8px', letterSpacing: '0.12em', marginBottom: '4px' }}>
            ATTITUDE / ALTITUDE
          </div>
          <div style={{ color: !tiltOK ? COLORS.amber : '#A8D4E8' }}>
            PITCH {pitchDeg >= 0 ? '+' : ''}{pitchDeg.toFixed(1)}°
          </div>
          <div style={{ color: !tiltOK ? COLORS.amber : '#A8D4E8' }}>
            ROLL  {rollDeg  >= 0 ? '+' : ''}{rollDeg.toFixed(1)}°
          </div>
          <div style={{ color: '#A8D4E8', marginTop: '2px' }}>
            ALT   {distanceMM != null ? `${distanceMM} mm` : 'OOR'}
          </div>
          {!tiltOK && (
            <div style={{
              color:      COLORS.amber,
              fontSize:   '9px',
              marginTop:  '4px',
              paddingTop: '4px',
              borderTop:  `1px solid ${COLORS.amber}`,
            }}>
              ⚠ TILT OUT OF RANGE ({TILT_THRESHOLD_DEG}°)
            </div>
          )}
          {!currentData && (
            <div style={{ color: COLORS.lightGray, fontSize: '9px', marginTop: '2px' }}>
              NO DATA
            </div>
          )}
        </div>

        {/* Deposit legend + world-map inset (hidden on mobile to avoid overlap) */}
        {!isMobile && <DepositLegend />}
        {!isMobile && <WorldMapInset />}

        {/* Source label */}
        <div style={{
          position:   'absolute',
          bottom:     '8px',
          right:      '8px',
          background: 'rgba(6, 32, 48, 0.7)',
          color:      '#7A9EAE',
          padding:    '3px 8px',
          fontSize:   '9px',
          fontFamily: 'monospace',
          letterSpacing: '0.05em',
          pointerEvents: 'none',
        }}>
          Source: ADXL345 accel · VL53L0X ToF · ESP32
        </div>
      </div>
    </div>
  )
}
