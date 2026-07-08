import { useState, useEffect, lazy, Suspense } from 'react'
import { Scene } from './components/Scene'
import { useDecayLoop } from './hooks/useDecayLoop'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useGameSave } from './hooks/useGameSave'
import { usePanelManager } from './hooks/usePanelManager'
import type { PanelId } from './hooks/usePanelManager'
import { useStore } from './store'
import { setTimeScaleTarget } from './components/TimeManager'
import { unlockPointer } from './utils/pointerLock'

// ── UI Layer System ──────────────────────────────
import { HUDLayer, ToastLayer, OnboardingFlow, ControlsHub } from './ui'

// ── Essential HUD components ─────────────────────
import { Crosshair } from './components/UI/Crosshair'
import { InteractionPrompt } from './components/UI/InteractionPrompt'
import { Hotbar } from './components/Building/Hotbar'
import { SaveIndicator } from './components/UI/SaveIndicator'
import { HealthHUD } from './components/UI/HealthHUD'
import { HarvestPopup } from './components/UI/HarvestPopup'
import { ComboDisplay } from './components/UI/ComboDisplay'
import { ClickToPlay } from './components/UI/ClickToPlay'
import { TimeCreditHUD } from './components/UI/TimeCreditHUD'
import { NextGoalHint } from './components/UI/NextGoalHint'
import { DeathScreen } from './components/Combat/HealthTracker'
import { FloatingDamage } from './components/UI/FloatingDamage'
import { FuelGauge } from './components/UI/FuelGauge'
import { SpeedEffects } from './components/UI/SpeedEffects'

// ── Core lazy-loaded panels ──────────────────────
const RefinePanel = lazy(() => import('./components/UI/RefinePanel').then(m => ({ default: m.RefinePanel })))
const LabModal = lazy(() => import('./components/Lab/LabModal').then(m => ({ default: m.LabModal })))
const TradeModal = lazy(() => import('./components/UI/TradeModal').then(m => ({ default: m.TradeModal })))
const InvestmentPanel = lazy(() => import('./components/Shrine/InvestmentPanel').then(m => ({ default: m.InvestmentPanel })))
const FormulaCompendium = lazy(() => import('./components/UI/FormulaCompendium').then(m => ({ default: m.FormulaCompendium })))
const FormulaDetailsPanel = lazy(() => import('./components/UI/FormulaDetailsPanel').then(m => ({ default: m.FormulaDetailsPanel })))
const PauseOverlay = lazy(() => import('./components/UI/PauseOverlay').then(m => ({ default: m.PauseOverlay })))
const RenownMilestoneWatcher = lazy(() => import('./components/UI/RenownMilestoneWatcher').then(m => ({ default: m.RenownMilestoneWatcher })))

// ── State watchers (no visual output) ────────────
import { AutoRefine } from './components/AutoRefine'
import { FeatureUnlockWatcher } from './components/FeatureUnlockWatcher'
import { BuildModeWatcher, AutoRefineWatcher } from './components/UI/BuildModeTransition'

// ── World bounds regeneration ─────────────────────
import { WorldBoundsWatcher } from './components/WorldBoundsWatcher'

// ── Ambient / audio ──────────────────────────────
import { AmbientMusic } from './components/AmbientMusic'
import { ErrorBoundary, CatastrophicFallback } from './components/ErrorBoundary'

// ── Toast notifications ──────────────────────────
import { ToastNotifications } from './components/UI/ToastNotifications'
import { RefineNotification } from './components/UI/RefineNotification'

/**
 * Full-screen overlay when WebGL context is lost.
 * Shows a themed error message and a recovery button.
 */
function WebGLCrashOverlay() {
  const [lost, setLost] = useState(false)
  useEffect(() => {
    const handler = () => setLost(true)
    window.addEventListener('webgl-context-lost', handler)
    return () => window.removeEventListener('webgl-context-lost', handler)
  }, [])
  if (!lost) return null
  return (
    <CatastrophicFallback
      error={new Error('WebGL context lost — the 3D renderer crashed. This can happen on low-power GPUs when too many visual effects are active.')}
      onReset={() => window.location.reload()}
    />
  )
}

function App() {
  const { panelStates, setPanelOpen, closeAll } = usePanelManager()
  const hasOpenPanels = Object.values(panelStates).some(Boolean)

  useDecayLoop()
  const { lastSaved, cloudStatus } = useGameSave()

  // Watch for panel-open requests from the 3D world
  const pendingOpenPanel = useStore((s) => s.pendingOpenPanel)
  const requestOpenPanel = useStore((s) => s.requestOpenPanel)
  useEffect(() => {
    if (pendingOpenPanel === 'trade') setPanelOpen('tradePanel', true)
    else if (pendingOpenPanel === 'shrine') setPanelOpen('shrinePanel', true)
    else if (pendingOpenPanel === 'refine') setPanelOpen('refinePanel', true)
    if (pendingOpenPanel) requestOpenPanel('')
  }, [pendingOpenPanel, requestOpenPanel, setPanelOpen])

  // Auto-show advanced HUD based on progression
  useEffect(() => {
    const unsub = useStore.subscribe((state) => {
      if (
        state.formulas.some((f) => f.discovered) ||
        state.totalBlocksPlaced >= 10 ||
        state.inventory.renown >= 5
      ) {
        setTimeout(() => {
          useStore.getState().setShowAdvancedHUD(true)
          unsub()
        }, 0)
      }
    })
    return unsub
  }, [])

  useKeyboardShortcuts({
    refinePanelOpen: panelStates.refinePanel,
    setRefinePanelOpen: (v) => setPanelOpen('refinePanel', v as boolean),
    closeAllPanels: closeAll,
    hasOpenPanels,
  })

  // Trigger bullet time when any modal is open
  const labOpen = useStore((s) => s.labOpen)
  useEffect(() => {
    const isAnyModalOpen = panelStates.refinePanel || panelStates.hirePanel
      || panelStates.tradePanel || panelStates.shrinePanel || labOpen
    if (isAnyModalOpen) {
      setTimeScaleTarget(0.05)
    } else {
      setTimeScaleTarget(1.0)
    }
  }, [panelStates.refinePanel, panelStates.hirePanel, panelStates.tradePanel, panelStates.shrinePanel, labOpen])

  // Auto-unlock pointer when any panel opens
  useEffect(() => {
    if (hasOpenPanels && document.pointerLockElement) {
      unlockPointer()
    }
  }, [hasOpenPanels])

  const close = (id: PanelId) => () => setPanelOpen(id, false)

  return (
    <div className="w-screen h-screen overflow-hidden bg-black">
      {/* ── WebGL Crash Overlay (sits above everything) ── */}
      <WebGLCrashOverlay />

      {/* ── Audio Systems ─────────────────────────── */}
      <ErrorBoundary name="AmbientMusic">
        <AmbientMusic />
      </ErrorBoundary>

      {/* ── 3D Scene ──────────────────────────────── */}
      <ErrorBoundary name="Scene" fallback={
        <div className="w-screen h-screen flex items-center justify-center bg-black/80 text-gray-400 font-mono text-sm">
          <div className="text-center">
            <div className="text-red-400 text-lg mb-2">⚠ 3D Scene crashed</div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white/70 hover:bg-white/20 transition-colors text-sm"
            >
              Reload
            </button>
          </div>
        </div>
      }>
        <Scene />
      </ErrorBoundary>

      {/* ── World Bounds Regeneration ──────────────── */}
      <WorldBoundsWatcher />

      {/* ── State Watchers ────────────────────────── */}
      <ErrorBoundary name="StateWatchers">
        <AutoRefine />
        <FeatureUnlockWatcher />
        <BuildModeWatcher />
        <AutoRefineWatcher />
      </ErrorBoundary>

      {/* ── HUD Layer ────────────────────────────── */}
      <ErrorBoundary name="HUDLayer">
      <HUDLayer>
        <TimeCreditHUD />
        <HealthHUD />
        <Crosshair />
        <InteractionPrompt />
        <HarvestPopup />
        <ComboDisplay />
        <NextGoalHint />
        <Hotbar />
        <SaveIndicator lastSaved={lastSaved} cloudStatus={cloudStatus} />
        <DeathScreen />
        <FloatingDamage />
        <FuelGauge />
        <SpeedEffects />
      </HUDLayer>
      </ErrorBoundary>

      {/* ── Toast Layer ──────────────────────────── */}
      <ErrorBoundary name="ToastLayer">
      <ToastLayer>
        <RefineNotification />
        <ToastNotifications />
      </ToastLayer>
      </ErrorBoundary>

      {/* ── Panel Layer ──────────────────────────── */}
      <Suspense fallback={null}>
        <RefinePanel open={panelStates.refinePanel} onClose={close('refinePanel')} />
        <TradeModal open={panelStates.tradePanel} onClose={close('tradePanel')} />
        <InvestmentPanel open={panelStates.shrinePanel} onClose={close('shrinePanel')} />
        <LabModal />
        <FormulaCompendium />
        <FormulaDetailsPanel />
        <RenownMilestoneWatcher />
      </Suspense>

      {/* ── Overlay Layer ────────────────────────── */}
      <ErrorBoundary name="Overlays">
        <ClickToPlay />
        <OnboardingFlow />
        <ControlsHub />
        <Suspense fallback={null}>
          {!hasOpenPanels && <PauseOverlay />}
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}

export default App
