import { useRef, useState } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store'

export const BlockHighlight = () => {
  const { camera, scene } = useThree()
  const selectedBlockType = useStore((s) => s.selectedBlockType)
  const blocks = useStore((s) => s.blocks)
  const raycaster = useRef(new THREE.Raycaster())
  const [hoverPos, setHoverPos] = useState<[number, number, number] | null>(null)
  const ref = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (selectedBlockType !== null) {
      if (hoverPos !== null) setHoverPos(null)
      return
    }

    raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera)
    const targets: THREE.Object3D[] = []
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && child.type === 'InstancedMesh') {
        targets.push(child)
      }
    })

    if (targets.length === 0) {
      if (hoverPos !== null) setHoverPos(null)
      return
    }

    const intersects = raycaster.current.intersectObjects(targets, false)
    let found: [number, number, number] | null = null

    for (const hit of intersects) {
      const mesh = hit.object as THREE.InstancedMesh
      if (mesh.type === 'InstancedMesh' && hit.instanceId !== undefined) {
        const matrix = new THREE.Matrix4()
        mesh.getMatrixAt(hit.instanceId, matrix)
        const position = new THREE.Vector3()
        position.setFromMatrixPosition(matrix)
        const gx = Math.round(position.x - 0.5)
        const gy = Math.round(position.y - 0.5)
        const gz = Math.round(position.z - 0.5)
        const key = `${gx},${gy},${gz}`
        if (blocks[key]) {
          found = [gx + 0.5, gy + 0.5, gz + 0.5]
          break
        }
      }
    }

    if (found) {
      if (!hoverPos || found[0] !== hoverPos[0] || found[1] !== hoverPos[1] || found[2] !== hoverPos[2]) {
        setHoverPos(found)
      }
    } else if (hoverPos !== null) {
      setHoverPos(null)
    }
  })

  if (!hoverPos) return null

  return (
    <mesh ref={ref} position={[hoverPos[0], hoverPos[1], hoverPos[2]]}>
      <boxGeometry args={[1.02, 1.02, 1.02]} />
      <meshBasicMaterial
        color="#44ffcc"
        transparent
        opacity={0.15}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  )
}
