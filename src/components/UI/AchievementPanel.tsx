import { useMemo } from 'react'
import { useStore } from '../../store'
import { ACHIEVEMENT_CATEGORIES } from '../../config/constants'

/**
 * Achievement panel that displays all achievements grouped by category.
 * Shows progress bars for each achievement and a count of unlocked/total.
 * Accessible via a button in the inventory or press `K`.
 */
export const AchievementPanel = () => {
  const achievementDefs = useStore((s) => s.achievementDefs)
  const achievementPanelOpen = useStore((s) => s.achievementPanelOpen)
  const setAchievementPanelOpen = useStore((s) => s.setAchievementPanelOpen)

  const total = achievementDefs.length
  const unlocked = achievementDefs.filter((a) => a.unlocked).length
  const unlockedPct = total > 0 ? Math.round((unlocked / total) * 100) : 0

  const categories = useMemo(() => {
    return ACHIEVEMENT_CATEGORIES.map((cat) => ({
      name: cat,
      achievements: achievementDefs.filter((a) => a.category === cat),
      unlocked: achievementDefs.filter((a) => a.category === cat && a.unlocked).length,
      total: achievementDefs.filter((a) => a.category === cat).length,
    }))
  }, [achievementDefs])

  const totalRenown = useMemo(
    () => achievementDefs.filter((a) => a.unlocked).reduce((sum, a) => sum + a.renownReward, 0),
    [achievementDefs],
  )

  if (!achievementPanelOpen) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900/95 border border-gray-700/50 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-sm tracking-wide uppercase">
              Achievements
            </h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {unlocked}/{total} unlocked ({unlockedPct}%) · {totalRenown} Renown earned
            </p>
          </div>
          <button
            onClick={() => setAchievementPanelOpen(false)}
            className="text-gray-500 hover:text-white transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-5 py-3 border-b border-gray-800/50">
          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${unlockedPct}%`,
                background: 'linear-gradient(90deg, #44ffaa, #aa88ff, #ffdd44)',
              }}
            />
          </div>
        </div>

        {/* Categories */}
        <div className="px-5 py-3 overflow-y-auto max-h-[60vh] space-y-4">
          {categories.map((cat) => (
            <div key={cat.name}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  {cat.name}
                </h3>
                <span className="text-[10px] text-gray-500 font-mono">
                  {cat.unlocked}/{cat.total}
                </span>
              </div>
              <div className="space-y-1.5">
                {cat.achievements.map((a) => (
                  <div
                    key={a.id}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all ${
                      a.unlocked
                        ? 'bg-gray-800/50 border border-gray-700/30'
                        : 'bg-gray-800/20 border border-gray-800/30 opacity-60'
                    }`}
                  >
                    <span className="text-base" style={{ color: a.color }}>
                      {a.unlocked ? a.icon : '?'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-medium truncate"
                        style={{ color: a.unlocked ? a.color : '#888' }}
                      >
                        {a.unlocked ? a.title : '???'}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate">
                        {a.unlocked ? a.description : 'Not yet discovered'}
                      </p>
                    </div>
                    {a.unlocked && (
                      <span className="text-[10px] text-teal-400 font-mono">
                        +{a.renownReward}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
