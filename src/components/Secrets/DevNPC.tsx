import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store'
import { getTerrainHeight } from '../../terrain'

const BASE_POS: [number, number, number] = [4, 0, -18]

const DEV_DIALOGUES = [
  "// TODO: implement reality",
  "git push --force origin main",
  "It's not a bug, it's a feature",
  "Works on my machine",
  "I'll fix it in the next sprint",
  "Have you tried turning it off and on?",
  "The cake is a lie",
  "42",
  "sudo rm -rf /*",
  "null pointer exception",
  "This is fine 🔥",
  "Production hotfix incoming",
]

/**
 * Dev NPC — a secret easter egg NPC that spawns near the Lab.
 * Has developer-themed dialogue and a distinctive appearance.
 * Marks the devNpcFound secret when first interacted with.
 */
export const DevNPC = () => {
  const groupRef = useRef<THREE.Group>(null)
  const time = useRef(Math.random() * 100)
  const [speech, setSpeech] = useState<string | null>(null)
  const devNpcFound = useStore((s) => s.devNpcFound)

  // Speak periodically
  useEffect(() => {
    const speak = () => {
      const msg = DEV_DIALOGUES[Math.floor(Math.random() * DEV_DIALOGUES.length)]
      setSpeech(msg)
      setTimeout(() => setSpeech(null), 3000)
    }
    speak()
    const interval = setInterval(speak, 4000 + Math.random() * 4000)
    return () => clearInterval(interval)
  }, [])

  const handleClick = () => {
    if (!devNpcFound) {
      useStore.setState({ devNpcFound: true })
    }
    setSpeech(DEV_DIALOGUES[Math.floor(Math.random() * DEV_DIALOGUES.length)])
    setTimeout(() => setSpeech(null), 3000)
  }

  const userData = useMemo(
    () => ({ interactable: true, type: 'npc', npcId: 'dev-npc', prompt: '[Click] Dev — he\'s busy coding' }),
    [],
  )

  const speechTexture = useMemo(() => {
    if (!speech) return null
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.beginPath()
    ctx.roundRect(8, 8, 240, 48, 12)
    ctx.fill()
    ctx.fillStyle = '#00ff88'
    ctx.font = 'bold 14px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(speech, 128, 38)
    return new THREE.CanvasTexture(canvas)
  }, [speech])

  const baseY = useRef(getTerrainHeight(BASE_POS[0], BASE_POS[2]) + 0.8)

  useFrame((_, delta) => {
    if (!groupRef.current) return
    time.current += delta
    groupRef.current.position.y = baseY.current + Math.sin(time.current * 0.5) * 0.05
    groupRef.current.rotation.y += delta * 0.3
  })

  return (
    <group ref={groupRef} position={[BASE_POS[0], getTerrainHeight(BASE_POS[0], BASE_POS[2]) + 0.8, BASE_POS[2]]}>
      {/* Console character body */}
      <mesh onClick={handleClick} userData={userData}>
        <boxGeometry args={[0.4, 0.7, 0.3]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.3} />
      </mesh>
      {/* Head — monitor shape */}
      <mesh position={[0, 0.55, 0]} onClick={handleClick}>
        <boxGeometry args={[0.3, 0.25, 0.05]} />
        <meshStandardMaterial color="#001122" emissive="#00ff88" emissiveIntensity={0.1} />
      </mesh>
      {/* Glowing eyes */}
      <mesh position={[-0.08, 0.55, 0.08]}>
        <sphereGeometry args={[0.03, 6, 6]} />
        <meshBasicMaterial color="#00ff88" />
      </mesh>
      <mesh position={[0.08, 0.55, 0.08]}>
        <sphereGeometry args={[0.03, 6, 6]} />
        <meshBasicMaterial color="#00ff88" />
      </mesh>
      {/* Floating code brackets */}
      <mesh position={[0.35, 0.1, 0]}>
        <boxGeometry args={[0.04, 0.12, 0.02]} />
        <meshBasicMaterial color="#ff6644" transparent opacity={0.6} />
      </mesh>
      <mesh position={[0.35, -0.05, 0]}>
        <boxGeometry args={[0.04, 0.12, 0.02]} />
        <meshBasicMaterial color="#ff6644" transparent opacity={0.6} />
      </mesh>
      {/* Speech bubble */}
      {speech && speechTexture && (
        <sprite position={[0, 1.2, 0]} scale={[2.5, 0.8, 1]}>
          <spriteMaterial
            map={speechTexture}
            transparent
            depthWrite={false}
          />
        </sprite>
      )}
    </group>
  )
}
