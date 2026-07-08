import { useState, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

interface AnimatedPanelProps {
  open: boolean
  onClose?: () => void
  children: ReactNode
  className?: string
  /** Direction the panel slides in from: 'right' | 'left' | 'up' | 'down' | 'none' */
  slideFrom?: 'right' | 'left' | 'up' | 'down' | 'none'
}

/**
 * Reusable animated panel wrapper.
 * 
 * Handles the full mount/unmount lifecycle with CSS transitions:
 * - Slides in from the specified direction with fade
 * - Slides out on close
 * - Cleans up DOM after transition completes
 * - Supports custom className and close button
 */
export const AnimatedPanel = ({
  open,
  onClose,
  children,
  className = '',
  slideFrom = 'right',
}: AnimatedPanelProps) => {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const prevOpen = useRef(open)

  useEffect(() => {
    if (open && !prevOpen.current) {
      // Opening: mount then animate in
      setMounted(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      })
    } else if (!open && prevOpen.current) {
      // Closing: animate out then unmount
      setVisible(false)
      const timer = setTimeout(() => {
        setMounted(false)
      }, 250) // matches transition duration
      return () => clearTimeout(timer)
    }
    prevOpen.current = open
  }, [open])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setMounted(false)
      setVisible(false)
    }
  }, [])

  if (!mounted) return null

  // Slide transforms
  const slideTransforms: Record<string, string> = {
    right: visible ? 'translateX(0)' : 'translateX(30px)',
    left: visible ? 'translateX(0)' : 'translateX(-30px)',
    up: visible ? 'translateY(0)' : 'translateY(30px)',
    down: visible ? 'translateY(0)' : 'translateY(-30px)',
    none: 'none',
  }

  return (
    <div
      className={`fixed inset-0 z-40 ${className}`}
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.2s ease-out',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.2s ease-out',
        }}
        onClick={onClose}
      />

      {/* Panel content */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transform: slideTransforms[slideFrom],
          transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease-out',
          opacity: visible ? 1 : 0,
        }}
      >
        {children}
      </div>
    </div>
  )
}
