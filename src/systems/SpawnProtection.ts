// ── Safe Zone at spawn (origin) ──────────────────────
let _spawnProtectionEnd = 0
let _safeZoneActive = true
const SAFE_ZONE_RADIUS = 35
const SPAWN_PROTECTION_DURATION = 15000

export function isInSafeZone(x: number, z: number): boolean {
  const dist = Math.sqrt(x * x + z * z)
  return dist < SAFE_ZONE_RADIUS
}

export function isSpawnProtected(): boolean {
  return performance.now() < _spawnProtectionEnd
}

export function getSpawnProtectionRemaining(): number {
  return Math.max(0, _spawnProtectionEnd - performance.now())
}

export function activateSpawnProtection() {
  _spawnProtectionEnd = performance.now() + SPAWN_PROTECTION_DURATION
  _safeZoneActive = true
}

export function deactivateSafeZone() {
  _safeZoneActive = false
}

export function isSafeZoneActive(): boolean {
  return _safeZoneActive
}

export function getSafeZoneRadius(): number {
  return SAFE_ZONE_RADIUS
}

export function checkEnemyAllowedInSafeZone(): boolean {
  // Enemies can enter safe zone only after protection wears off
  return !isSpawnProtected() && !_safeZoneActive
}

// Initialize on module load
activateSpawnProtection()
