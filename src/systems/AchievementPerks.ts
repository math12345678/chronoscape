// ── Achievement Perks — each unlocked achievement grants a permanent buff ──

export type AchievementId = string

export interface PerkDef {
  achievementId: AchievementId
  name: string
  description: string
  effect: string
  type: 'harvest' | 'damage' | 'speed' | 'range' | 'regen' | 'loot' | 'fireRate' | 'exp' | 'trade' | 'defense' | 'critical'
  value: number // multiplier or flat bonus
}

export const ACHIEVEMENT_PERKS: Record<string, PerkDef> = {
  firstBlood: {
    achievementId: 'firstBlood', name: 'First Blood', description: 'Deal damage to your first enemy.',
    effect: '+5% damage', type: 'damage', value: 0.05,
  },
  centurion: {
    achievementId: 'centurion', name: 'Centurion', description: 'Kill 100 enemies.',
    effect: '+10% damage', type: 'damage', value: 0.10,
  },
  destroyer: {
    achievementId: 'destroyer', name: 'Destroyer', description: 'Kill 1000 enemies.',
    effect: '+20% damage', type: 'damage', value: 0.20,
  },
  annihilator: {
    achievementId: 'annihilator', name: 'Annihilator', description: 'Kill 10000 enemies.',
    effect: '+50% damage', type: 'damage', value: 0.50,
  },
  speedDemon: {
    achievementId: 'speedDemon', name: 'Speed Demon', description: 'Win 3 drag races.',
    effect: '+10% speed', type: 'speed', value: 0.10,
  },
  championRacer: {
    achievementId: 'championRacer', name: 'Champion Racer', description: 'Win 50 drag races.',
    effect: '+25% speed', type: 'speed', value: 0.25,
  },
  roadLegend: {
    achievementId: 'roadLegend', name: 'Road Legend', description: 'Win 500 drag races.',
    effect: '+50% speed', type: 'speed', value: 0.50,
  },
  hoarder: {
    achievementId: 'hoarder', name: 'Hoarder', description: 'Amass 10,000 Raw resources.',
    effect: '+10% harvest', type: 'harvest', value: 0.10,
  },
  millionaire: {
    achievementId: 'millionaire', name: 'Millionaire', description: 'Amass 1,000,000 Raw resources.',
    effect: '+25% harvest', type: 'harvest', value: 0.25,
  },
  billionaire: {
    achievementId: 'billionaire', name: 'Billionaire', description: 'Amass 1,000,000,000 Raw resources.',
    effect: '+100% harvest', type: 'harvest', value: 1.0,
  },
  builder: {
    achievementId: 'builder', name: 'Builder', description: 'Build 10 buildings.',
    effect: '+10% range', type: 'range', value: 0.10,
  },
  architect: {
    achievementId: 'architect', name: 'Architect', description: 'Build 100 buildings.',
    effect: '+25% range', type: 'range', value: 0.25,
  },
  collector: {
    achievementId: 'collector', name: 'Collector', description: 'Collect 50 time orbs.',
    effect: '+15% loot', type: 'loot', value: 0.15,
  },
  orbMaster: {
    achievementId: 'orbMaster', name: 'Orb Master', description: 'Collect 500 time orbs.',
    effect: '+30% loot', type: 'loot', value: 0.30,
  },
  prestige1: {
    achievementId: 'prestige1', name: 'First Prestige', description: 'Prestige for the first time.',
    effect: '+1 base regen', type: 'regen', value: 1,
  },
  prestige10: {
    achievementId: 'prestige10', name: 'Prestige 10', description: 'Reach prestige rank 10.',
    effect: '+5 base regen', type: 'regen', value: 5,
  },
  prestige20: {
    achievementId: 'prestige20', name: 'Prestige 20', description: 'Reach prestige rank 20.',
    effect: '+15 base regen', type: 'regen', value: 15,
  },
  explorer: {
    achievementId: 'explorer', name: 'Explorer', description: 'Discover 5 locations.',
    effect: '+10% fire rate', type: 'fireRate', value: 0.10,
  },
  cartographer: {
    achievementId: 'cartographer', name: 'Cartographer', description: 'Discover 20 locations.',
    effect: '+25% fire rate', type: 'fireRate', value: 0.25,
  },
  trader: {
    achievementId: 'trader', name: 'Trader', description: 'Complete 1 trade route.',
    effect: '+15% trade', type: 'trade', value: 0.15,
  },
  merchantPrince: {
    achievementId: 'merchantPrince', name: 'Merchant Prince', description: 'Complete 100 trade routes.',
    effect: '+50% trade', type: 'trade', value: 0.50,
  },
  survivor: {
    achievementId: 'survivor', name: 'Survivor', description: 'Survive 10 expedition waves.',
    effect: '+10% defense', type: 'defense', value: 0.10,
  },
  expeditionHero: {
    achievementId: 'expeditionHero', name: 'Expedition Hero', description: 'Survive 100 expedition waves.',
    effect: '+25% defense', type: 'defense', value: 0.25,
  },
  crafter: {
    achievementId: 'crafter', name: 'Crafter', description: 'Craft your first item.',
    effect: '+5% critical chance', type: 'critical', value: 0.05,
  },
  masterCrafter: {
    achievementId: 'masterCrafter', name: 'Master Crafter', description: 'Craft 100 items.',
    effect: '+10% critical chance', type: 'critical', value: 0.10,
  },
}

let _unlockedPerks: Set<string> = new Set()

/** Call when an achievement is unlocked to register its perk */
export function registerPerk(achievementId: AchievementId): void {
  const perkKey = Object.keys(ACHIEVEMENT_PERKS).find(
    (k) => ACHIEVEMENT_PERKS[k].achievementId === achievementId
  )
  if (perkKey) _unlockedPerks.add(perkKey)
}

/** Get total modifier for a given perk type */
export function getAchievementPerkModifier(type: PerkDef['type']): number {
  let total = 0
  for (const key of _unlockedPerks) {
    const perk = ACHIEVEMENT_PERKS[key]
    if (perk && perk.type === type) {
      total += perk.value
    }
  }
  return total
}

/** Get all unlocked perks' descriptions */
export function getUnlockedPerks(): PerkDef[] {
  return Array.from(_unlockedPerks)
    .map((k) => ACHIEVEMENT_PERKS[k])
    .filter(Boolean)
}

/** Get total perks unlocked count */
export function getUnlockedPerkCount(): number {
  return _unlockedPerks.size
}

/** Import perks from saved data */
export function loadAchievementPerks(ids: string[]): void {
  _unlockedPerks = new Set(ids)
}

export function serializeAchievementPerks(): string[] {
  return Array.from(_unlockedPerks)
}
