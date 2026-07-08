import { useEffect } from 'react'
import { useStore } from '../store'
import { refreshSkillUnlocks } from './ChronoSKills'

/**
 * Watches formula discovery state and refreshes skill unlocks
 * whenever a formula is discovered.
 */
export const SkillUnlockWatcher = () => {
  const formulas = useStore(s => s.formulas)

  useEffect(() => {
    refreshSkillUnlocks()
  }, [formulas])

  return null
}
