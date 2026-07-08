import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface SpeechBubbleProps {
  text: string
  color?: string
  position: [number, number, number]
  bubbleHeight?: number
  fadeIn?: boolean
}

/** Maximum text width before wrapping */
const MAX_CHARS = 28
/** Seconds for the full fade-in animation */
const FADE_DURATION = 0.4

/**
 * A floating 3D text sprite that hovers above an entity.
 * Renders text to a canvas texture, creates a sprite with a soft glow border.
 * Animates in with a fade+rise effect.
 */
export const SpeechBubble = ({
  text,
  color = '#ffffff',
  position,
  bubbleHeight = 2.2,
  fadeIn = true,
}: SpeechBubbleProps) => {
  const spriteRef = useRef<THREE.Sprite>(null)
  const elapsed = useRef(0)

  // Wrap long text
  const displayText = useMemo(() => {
    if (text.length <= MAX_CHARS) return text
    const words = text.split(' ')
    let result = ''
    let line = ''
    for (const word of words) {
      if ((line + ' ' + word).length > 24) {
        result += line + '\n'
        line = word
      } else {
        line = (line ? line + ' ' : '') + word
      }
    }
    return result + line
  }, [text])

  // Generate canvas texture for the text
  const { spriteMaterial } = useMemo(() => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    canvas.width = 256
    canvas.height = 96

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Background pill shape with glow
    const radius = 28
    const bw = canvas.width - 16
    const bh = canvas.height - 16
    const bx = 8
    const by = 8

    // Outer glow
    ctx.shadowColor = `${color}44`
    ctx.shadowBlur = 20
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.beginPath()
    ctx.moveTo(bx + radius, by)
    ctx.lineTo(bx + bw - radius, by)
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + radius)
    ctx.lineTo(bx + bw, by + bh - radius)
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - radius, by + bh)
    ctx.lineTo(bx + radius, by + bh)
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - radius)
    ctx.lineTo(bx, by + radius)
    ctx.quadraticCurveTo(bx, by, bx + radius, by)
    ctx.closePath()
    ctx.fill()

    // Border
    ctx.shadowBlur = 0
    ctx.strokeStyle = `${color}44`
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Draw text
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const lines = displayText.split('\n')
    const lineHeight = 24
    const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2

    for (let i = 0; i < lines.length; i++) {
      // Shadow for readability
      ctx.shadowColor = 'rgba(0,0,0,0.8)'
      ctx.shadowBlur = 6
      ctx.font = 'bold 18px "Courier New", monospace'
      ctx.fillStyle = color
      ctx.fillText(lines[i], canvas.width / 2, startY + i * lineHeight)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: fadeIn ? 0 : 1,
      depthWrite: false,
      depthTest: true,
      sizeAttenuation: true,
    })

    return { spriteMaterial: material }
  }, [displayText, color, fadeIn])

  // Animate fade-in and floating
  useFrame((_, delta) => {
    if (!spriteRef.current) return

    elapsed.current += delta

    if (fadeIn && elapsed.current < FADE_DURATION) {
      spriteMaterial.opacity = Math.min(1, elapsed.current / FADE_DURATION)
    }

    // Gentle float
    const floatY = Math.sin(elapsed.current * 1.2) * 0.06
    spriteRef.current.position.y = position[1] + bubbleHeight + floatY
    spriteRef.current.position.x = position[0]
    spriteRef.current.position.z = position[2]

    // Scale based on distance from camera (handled by sizeAttenuation)
    spriteRef.current.scale.setScalar(1.8)
  })

  return (
    <sprite ref={spriteRef} material={spriteMaterial} position={[position[0], position[1] + bubbleHeight, position[2]]} />
  )
}

/**
 * Manages speech bubbles for all NPCs.
 * Each NPC gets a contextual status message.
 */
export const NPC_SPEECHES: Record<string, string[]> = {
  idle: ['...', '...', '... watching the sky', 'Just thinking', 'Peaceful today'],
  wander: ['Where should I go?', 'Exploring...', 'Nice day for a walk', 'The path unwinds'],
  seek_rift: ['I sense a rift!', 'Over there!', 'Time energy...', 'Follow me!'],
  harvest: ['Got some!', 'Harvesting...', 'So much time!', 'This feels powerful'],
  return: ['Taking it back', 'On my way', 'Almost there...'],
  rest: ['Need a break...', 'So tired...', 'Just resting', 'A moment to breathe'],
  tour: ['Beautiful view!', 'I love this place', 'Have you seen the view?', 'Breathtaking!'],
  interacting: [
    'Hello!', 'Nice day, isn\'t it?', 'Have you seen the rift?',
    'I was just thinking...', 'The time flows strangely today',
    'Did you feel that?', 'I should get back to work',
    'Have you visited the Lab?', 'The Shrine is calling',
    'We should talk again soon',
  ],
  follow: ['Waiting for you', 'I\'ll follow', 'Where to?', 'Right behind you', 'On your lead'],
  seek_shelter: ['Getting dark...', 'Time to find shelter', 'The night is coming', 'I should take cover'],
}

/** Night-time speeches — more contemplative and chatty */
export const NIGHT_SPEECHES: Record<string, string[]> = {
  idle: ['The stars are beautiful...', 'Can you hear the night?', 'So quiet...', 'Time sleeps too'],
  wander: ['I should find shelter', 'It\'s getting cold', 'Where is everyone?', 'The dark is deep'],
  seek_shelter: ['Almost there!', 'Just a bit further', 'The light...', 'This way!'],
  rest: ['Finally safe', 'The night is long', 'I\'ll rest here', 'Listening to the dark'],
  seek_rift: ['Rifts glow brighter at night', 'I see it!', 'The time energy pulses'],
  tour: ['So different at night', 'Everything changes', 'The world looks new'],
  interacting: [
    'It\'s getting dark...', 'Should we head to shelter?',
    'I don\'t like the night alone', 'The Lab has light',
    'Let\'s stay close', 'The Shrine glows warmly',
    'We should gather together',
  ],
  follow: ['Stay close', 'Don\'t wander off', 'I\'m right here', 'The dark is safer together'],
}

export const NPC_NAMES = [
  'Nimbus', 'Chrono', 'Tempus', 'Eon', 'Vesper',
  'Solara', 'Lunaris', 'Stella', 'Orion', 'Nova',
  'Cipher', 'Flux', 'Echo', 'Pixel', 'Zephyr',
]
