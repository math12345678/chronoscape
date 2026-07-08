import React, { type ReactNode } from 'react'

/**
 * UI Layer system that organizes all UI elements into proper z-index layers.
 *
 * Layer hierarchy (bottom → top):
 *   SCENE  = 0          (3D canvas - background)
 *   HUD    = 20-39      (always-visible UI: inventory, health, crosshair, minimap)
 *   TOAST  = 40-49      (transient notifications: toasts, floating numbers)
 *   PANEL  = 50-69      (modal panels: refine, trade, lab, etc.)
 *   OVERLAY = 70-89     (full-screen overlays: pause, welcome, death)
 *   MODAL  = 90-100     (critical modals: formula discovery, announcements)
 */

export const UILayer = {
  HUD: 20,
  HUD_TOP: 30,
  TOAST: 40,
  PANEL: 50,
  PANEL_TOP: 60,
  OVERLAY: 70,
  OVERLAY_TOP: 80,
  MODAL: 90,
  MODAL_TOP: 100,
} as const

type LayerValue = (typeof UILayer)[keyof typeof UILayer]

interface LayerProps {
  children: ReactNode
  layer: LayerValue
  /** If true, pointer events pass through to layers below */
  pointerEvents?: 'auto' | 'none'
  className?: string
  style?: React.CSSProperties
}

/**
 * Generic layer container with proper z-index and positioning.
 * All UI elements should be wrapped in a Layer to maintain consistent
 * visual hierarchy.
 */
export const Layer = ({
  children,
  layer,
  pointerEvents = 'auto',
  className = '',
  style,
}: LayerProps) => (
  <div
    className={`fixed inset-0 ${className}`}
    style={{
      zIndex: layer,
      pointerEvents,
      ...style,
    }}
  >
    {children}
  </div>
)

/**
 * HUD Layer — fixed position elements like inventory, health, crosshair.
 * Uses pointer-events: none so clicks pass through to the 3D canvas.
 * Individual HUD elements that need interaction (buttons, sliders)
 * must set pointer-events: auto on themselves.
 */
export const HUDLayer = ({ children }: { children: ReactNode }) => (
  <div style={{ position: 'fixed', inset: 0, zIndex: UILayer.HUD, pointerEvents: 'none' }}>
    {children}
  </div>
)

/**
 * Toast/Notification Layer — floats above HUD but below panels.
 */
export const ToastLayer = ({ children }: { children: ReactNode }) => (
  <Layer layer={UILayer.TOAST} pointerEvents="none">
    <div className="pointer-events-auto">{children}</div>
  </Layer>
)

/**
 * Panel Layer — modal panels with backdrop.
 */
export const PanelLayer = ({
  children,
  visible,
  onBackdropClick,
}: {
  children: ReactNode
  visible: boolean
  onBackdropClick?: () => void
}) => (
  <Layer
    layer={UILayer.PANEL}
    pointerEvents={visible ? 'auto' : 'none'}
    style={{
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.2s ease-out',
    }}
  >
    {/* Backdrop */}
    {visible && (
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200"
        onClick={onBackdropClick}
      />
    )}
    {/* Panel container — centered */}
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease-out',
      }}
    >
      {children}
    </div>
  </Layer>
)

/**
 * Overlay Layer — full-screen overlays.
 */
export const OverlayLayer = ({
  children,
  visible,
}: {
  children: ReactNode
  visible: boolean
}) => (
  <Layer
    layer={UILayer.OVERLAY}
    pointerEvents={visible ? 'auto' : 'none'}
    style={{
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.3s ease-out',
      pointerEvents: visible ? 'auto' : 'none',
    }}
  >
    {children}
  </Layer>
)

/**
 * Modal Layer — critical modals that must appear above everything.
 */
export const ModalLayer = ({
  children,
  visible,
}: {
  children: ReactNode
  visible: boolean
}) => (
  <Layer
    layer={UILayer.MODAL}
    pointerEvents={visible ? 'auto' : 'none'}
    style={{
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.3s ease-out',
    }}
  >
    {children}
  </Layer>
)
