export const COLORS = {
  navy:      '#0B3D5C',
  navyDark:  '#062030',
  navyLight: '#1A5276',
  darkGray:  '#1C1C1C',
  midGray:   '#4A4A4A',
  lightGray: '#8A8A82',
  offWhite:  '#F4F4EF',
  white:     '#FFFFFF',
  amber:     '#D4881A',
  border:    '#C0C0B8',
  gridLine:  '#E0E0D8',
}

// Must match firmware THRESHOLD constant
export const HALL_THRESHOLD = 30

// Degrees beyond which tilt is flagged as anomaly
export const TILT_THRESHOLD_DEG = 20

// Set to true to run with simulated data — no ESP32 hardware required
export const DEMO_MODE = true

// Polling interval in ms
export const POLL_INTERVAL_MS = 700

// Number of history points to retain (~2 min at default poll rate)
export const HISTORY_LEN = 120
