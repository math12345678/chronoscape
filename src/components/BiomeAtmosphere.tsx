import { useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useFrameThrottled } from '../hooks/useFrameThrottled'
import * as THREE from 'three'
import { getBiomeAt } from '../world/biome'

// ── Pre-computed biome color palettes (zero allocation per frame) ──
// All 13 biomes from the climate-driven biome system

const BIOME_PALETTES: Record<string, { fog: THREE.Color; hemiSky: THREE.Color; hemiGround: THREE.Color }> = {
  plains: {
    fog: new THREE.Color('#0a1520'),
    hemiSky: new THREE.Color('#6688cc'),
    hemiGround: new THREE.Color('#223322'),
  },
  forest: {
    fog: new THREE.Color('#0a1a15'),
    hemiSky: new THREE.Color('#557755'),
    hemiGround: new THREE.Color('#224433'),
  },
  dense_forest: {
    fog: new THREE.Color('#081a12'),
    hemiSky: new THREE.Color('#448844'),
    hemiGround: new THREE.Color('#1a3322'),
  },
  taiga: {
    fog: new THREE.Color('#0a1525'),
    hemiSky: new THREE.Color('#5577aa'),
    hemiGround: new THREE.Color('#334455'),
  },
  jungle: {
    fog: new THREE.Color('#051a10'),
    hemiSky: new THREE.Color('#44aa55'),
    hemiGround: new THREE.Color('#224422'),
  },
  savanna: {
    fog: new THREE.Color('#1a1a10'),
    hemiSky: new THREE.Color('#aa9955'),
    hemiGround: new THREE.Color('#554433'),
  },
  desert: {
    fog: new THREE.Color('#1a1a12'),
    hemiSky: new THREE.Color('#ccbb88'),
    hemiGround: new THREE.Color('#665544'),
  },
  rocky_desert: {
    fog: new THREE.Color('#151518'),
    hemiSky: new THREE.Color('#999988'),
    hemiGround: new THREE.Color('#554455'),
  },
  rocky_highlands: {
    fog: new THREE.Color('#12151a'),
    hemiSky: new THREE.Color('#7788aa'),
    hemiGround: new THREE.Color('#443344'),
  },
  beach: {
    fog: new THREE.Color('#0a1a22'),
    hemiSky: new THREE.Color('#7799bb'),
    hemiGround: new THREE.Color('#554433'),
  },
  wetlands: {
    fog: new THREE.Color('#0a1a20'),
    hemiSky: new THREE.Color('#447788'),
    hemiGround: new THREE.Color('#334433'),
  },
  tundra: {
    fog: new THREE.Color('#121a1e'),
    hemiSky: new THREE.Color('#8899aa'),
    hemiGround: new THREE.Color('#445555'),
  },
  snowy_plains: {
    fog: new THREE.Color('#181a22'),
    hemiSky: new THREE.Color('#aabbdd'),
    hemiGround: new THREE.Color('#556677'),
  },
}

// Default palette
const DEFAULT_PALETTE = BIOME_PALETTES.plains

/**
 * Biome-specific atmospheric effects.
 * Reads the player's current biome from their position and smoothly
 * interpolates fog color, hemisphere light tint, and renderer clear color.
 *
 * Performance: pre-computed color constants, scratch refs for lerp, no GC per frame.
 */
export const BiomeAtmosphere = () => {
  const { scene, camera } = useThree()
  const currentBiome = useRef<string>('plains')
  const lerpedSky = useRef(new THREE.Color(DEFAULT_PALETTE.hemiSky))
  const lerpedGround = useRef(new THREE.Color(DEFAULT_PALETTE.hemiGround))

  // Cache hemiLight ref to avoid scene lookups every frame
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null)
  const cameraRef = useRef(camera)

  useFrameThrottled(() => {
    // Get camera position
    const cam = cameraRef.current
    const px = cam.position.x
    const pz = cam.position.z

    const biome = getBiomeAt(px, pz)

    // Get target palette (zero allocation — constant lookup)
    const palette = BIOME_PALETTES[biome] ?? DEFAULT_PALETTE

    // Smooth interpolation for hemisphere light only (NOT fog/clear color — DayNightCycle handles those)
    const lerpSpeed = currentBiome.current !== biome ? 0.03 : 0.01
    lerpedSky.current.lerp(palette.hemiSky, lerpSpeed)
    lerpedGround.current.lerp(palette.hemiGround, lerpSpeed)
    currentBiome.current = biome

    // Only modulate hemisphere light tint — blend with existing color so DayNightCycle's
    // brightness/intensity changes are preserved
    if (!hemiLightRef.current) {
      hemiLightRef.current = scene.getObjectByName('hemiLight') as THREE.HemisphereLight | null
    }
    const hemiLight = hemiLightRef.current
    if (hemiLight) {
      // Blend: 30% biome tint, 70% existing (time-of-day) color
      hemiLight.color.copy(lerpedSky.current).lerp(hemiLight.color, 0.7)
      hemiLight.groundColor.copy(lerpedGround.current).lerp(hemiLight.groundColor, 0.7)
    }
  }, 3)

  return null
}
