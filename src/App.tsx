import { useState, useEffect } from 'react'
import { Scene } from './components/Scene'
import { Inventory } from './components/UI/Inventory'
import { Crosshair } from './components/UI/Crosshair'
import { Compass } from './components/UI/Compass'
import { InteractionPrompt } from './components/UI/InteractionPrompt'
import { ClickToPlay } from './components/UI/ClickToPlay'
import { RefinePanel } from './components/UI/RefinePanel'
import { RefineNotification } from './components/UI/RefineNotification'
import { Hotbar } from './components/Building/Hotbar'
import { LabModal } from './components/Lab/LabModal'
import { HirePanel } from './components/UI/HirePanel'
import { TradeModal } from './components/UI/TradeModal'
import { InvestmentPanel } from './components/Shrine/InvestmentPanel'
import { AnomalyBanner } from './components/TimeAnomaly'
import { ToastNotifications } from './components/UI/ToastNotifications'
import { SaveIndicator } from './components/UI/SaveIndicator'
import { OnboardingHint } from './components/UI/OnboardingHint'
import { VolumeControl } from './components/UI/VolumeControl'
import { AmbientMusic } from './components/AmbientMusic'
import { useDecayLoop } from './hooks/useDecayLoop'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useGameSave } from './hooks/useGameSave'
import { useStore } from './store'

function App() {
  const [refinePanelOpen, setRefinePanelOpen] = useState(false)
  const [hirePanelOpen, setHirePanelOpen] = useState(false)
  const [tradePanelOpen, setTradePanelOpen] = useState(false)
  const [shrinePanelOpen, setShrinePanelOpen] = useState(false)

  useDecayLoop()
  const { lastSaved } = useGameSave()
  useKeyboardShortcuts({
    refinePanelOpen,
    setRefinePanelOpen,
    hirePanelOpen,
    setHirePanelOpen,
    tradePanelOpen,
    setTradePanelOpen,
    shrinePanelOpen,
    setShrinePanelOpen,
  })

  // Trigger bullet time when any modal is open
  const setTimeScaleTarget = useStore((s) => s.setTimeScaleTarget)
  const labOpen = useStore((s) => s.labOpen)
  
  useEffect(() => {
    const isAnyModalOpen = refinePanelOpen || hirePanelOpen || tradePanelOpen || shrinePanelOpen || labOpen
    if (isAnyModalOpen) {
      setTimeScaleTarget(0.05)
    } else {
      setTimeScaleTarget(1.0)
    }
  }, [refinePanelOpen, hirePanelOpen, tradePanelOpen, shrinePanelOpen, labOpen, setTimeScaleTarget])

  return (
    <div className="w-screen h-screen overflow-hidden bg-black">
      {/* Procedural ambient music */}
      <AmbientMusic />

      <Scene />
      <Inventory />
      <Compass />
      <Crosshair />
      <InteractionPrompt />
      <RefineNotification />
      <SaveIndicator lastSaved={lastSaved} />
      <Hotbar />
      <ClickToPlay />
      {refinePanelOpen && <RefinePanel onClose={() => setRefinePanelOpen(false)} />}
      {hirePanelOpen && <HirePanel onClose={() => setHirePanelOpen(false)} />}
      {tradePanelOpen && <TradeModal onClose={() => setTradePanelOpen(false)} />}
      {shrinePanelOpen && <InvestmentPanel onClose={() => setShrinePanelOpen(false)} />}
      <LabModal />
      <AnomalyBanner />
      <ToastNotifications />
      <OnboardingHint />
      <VolumeControl />
    </div>
  )
}

export default App
