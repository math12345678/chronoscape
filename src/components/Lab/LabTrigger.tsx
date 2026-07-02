import { useThree, useFrame } from '@react-three/fiber'
import { useStore } from '../../store'
import { LAB_POSITION, LAB_TRIGGER_RADIUS } from '../../config/constants'

/**
 * Sits inside the R3F Canvas and checks the camera's distance to the Lab
 * position every frame. When the player walks within trigger radius, the
 * Lab modal opens automatically. Walking away closes it.
 */
export const LabTrigger = () => {
  const { camera } = useThree()
  const labOpen = useStore((s) => s.labOpen)
  const openLab = useStore((s) => s.openLab)
  const closeLab = useStore((s) => s.closeLab)

  useFrame(() => {
    const dx = camera.position.x - LAB_POSITION[0]
    const dz = camera.position.z - LAB_POSITION[2]
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist < LAB_TRIGGER_RADIUS && !labOpen) {
      openLab()
    } else if (dist >= LAB_TRIGGER_RADIUS && labOpen) {
      closeLab()
    }
  })

  return null
}
