import * as THREE from 'three'

/** Module-level camera state shared between 3D scene and UI overlays */
let _cameraPos = new THREE.Vector3()
let _cameraAngle = 0

export function setCameraState(pos: THREE.Vector3, angle: number) {
  _cameraPos.copy(pos)
  _cameraAngle = angle
}

export function getCameraPosition() { return _cameraPos }
export function getCameraAngle() { return _cameraAngle }
