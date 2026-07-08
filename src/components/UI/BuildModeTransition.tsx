import { useEffect, useRef } from 'react'
import { useStore } from '../../store'
import { triggerShake } from '../../hooks/useScreenShake'

/**
 * Watches for build mode entry/exit and triggers screen effects.
 * - Entering build mode: subtle flash + shake
 * - Exiting build mode: subtle vignette pop
 */
export const BuildModeWatcher = () => {
  const selectedBlockType = useStore((s) => s.selectedBlockType)
  const prevRef = useRef(selectedBlockType)

  useEffect(() => {
    const prev = prevRef.current
    const entering = !prev && selectedBlockType
    const exiting = prev && !selectedBlockType

    if (entering) {
      triggerShake(0.08, 4, 0.15)
      const flash = document.createElement('div')
      flash.style.cssText =
        'position:fixed;inset:0;background:radial-gradient(ellipse at 50% 50%, rgba(250,204,21,0.18) 0%, rgba(250,204,21,0.06) 40%, transparent 70%);pointer-events:none;z-index:9999;transition:opacity 0.2s ease-out;mix-blend-mode:screen'
      document.body.appendChild(flash)
      requestAnimationFrame(() => { flash.style.opacity = '0.8' })
      setTimeout(() => {
        flash.style.opacity = '0'
        setTimeout(() => { if (flash.parentNode) flash.parentNode.removeChild(flash) }, 300)
      }, 120)
    }

    if (exiting) {
      triggerShake(0.05, 3, 0.1)
      const flash = document.createElement('div')
      flash.style.cssText =
        'position:fixed;inset:0;background:radial-gradient(ellipse at 50% 50%, rgba(100,200,255,0.1) 0%, transparent 60%);pointer-events:none;z-index:9999;transition:opacity 0.15s ease-out'
      document.body.appendChild(flash)
      requestAnimationFrame(() => { flash.style.opacity = '1' })
      setTimeout(() => {
        flash.style.opacity = '0'
        setTimeout(() => { if (flash.parentNode) flash.parentNode.removeChild(flash) }, 200)
      }, 80)
    }

    prevRef.current = selectedBlockType
  }, [selectedBlockType])

  return null
}

/**
 * Listens for auto-refine events and creates floating "+N Chrono" text
 * that rises from the bottom of the screen.
 */
export const AutoRefineWatcher = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail
      if (!d || !d.amount) return

      // Screen flash
      const flash = document.createElement('div')
      flash.style.cssText =
        `position:fixed;inset:0;background:radial-gradient(ellipse at 50% 50%, rgba(255,170,0,0.12) 0%, rgba(255,170,0,0.04) 40%, transparent 70%);pointer-events:none;z-index:9998;transition:opacity 0.3s ease-out`
      document.body.appendChild(flash)
      requestAnimationFrame(() => { flash.style.opacity = '1' })
      setTimeout(() => {
        flash.style.opacity = '0'
        setTimeout(() => { if (flash.parentNode) flash.parentNode.removeChild(flash) }, 400)
      }, 200)

      // Floating "+N Chrono" text
      const popup = document.createElement('div')
      const size = Math.min(1 + d.amount * 0.03, 2.5)
      popup.textContent = `+${d.amount} Chrono`
      popup.style.cssText =
        `position:fixed;bottom:20%;left:50%;transform:translateX(-50%);color:#ffaa44;font-family:monospace;font-size:${size}rem;font-weight:bold;pointer-events:none;z-index:10000;text-shadow:0 0 20px rgba(255,170,68,0.6),0 0 60px rgba(255,170,68,0.3);transition:all 1.2s cubic-bezier(0.22,1,0.36,1);opacity:1`
      document.body.appendChild(popup)
      requestAnimationFrame(() => {
        popup.style.transform = 'translateX(-50%) translateY(-120px)'
        popup.style.opacity = '0'
      })
      setTimeout(() => { if (popup.parentNode) popup.parentNode.removeChild(popup) }, 1400)
    }
    window.addEventListener('auto-refine', handler)
    return () => window.removeEventListener('auto-refine', handler)
  }, [])

  return null
}
