/**
 * Standard complementary-filter pitch/roll from a 3-axis accelerometer.
 * Works at rest or near-rest; augment with gyro integration for dynamic use.
 *
 * ADXL345 returns m/s².  At rest, az ≈ ±9.81 depending on mount orientation.
 * If the model rotates backwards, negate ax or swap the argument order.
 */
export function computePitchRoll(ax, ay, az) {
  if (ax == null || ay == null || az == null) return { pitch: 0, roll: 0 }
  const pitch = Math.atan2(-ax, Math.sqrt(ay * ay + az * az))
  const roll  = Math.atan2(ay, az)
  return { pitch, roll }
}

export function radToDeg(rad) {
  return (rad * 180) / Math.PI
}
