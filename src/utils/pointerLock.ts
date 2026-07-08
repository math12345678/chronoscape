export function lockPointer() {
  const canvas = document.querySelector('canvas')
  if (canvas) canvas.requestPointerLock()
  else document.body.requestPointerLock()
}

export function unlockPointer() {
  document.exitPointerLock()
}
