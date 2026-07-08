// ── Environment Lore — discoverable lore fragments, ruins, echoes ──

export type LoreCategory = 'fragment' | 'ruin' | 'echo' | 'diary' | 'artifact'

export interface LoreEntry {
  id: string
  category: LoreCategory
  title: string
  text: string
  author: string
  location: string
  discoveryCondition: string // what triggers the find
  icon: string
  color: string
  era: string
}

const LORE: LoreEntry[] = [
  // ── Fragments ──
  {
    id: 'frag_origin', category: 'fragment',
    title: 'Fragment of Origin', icon: '📜', color: '#44ff88',
    author: 'First Chronomancer', location: 'The Beginning',
    era: 'Year Zero', discoveryCondition: 'Prestige once',
    text: 'Time is not a line but a knot. Pull one string and the entire tapestry shifts. We, the first chronomancers, learned this the hard way. Pray you never see the knot unravel.',
  },
  {
    id: 'frag_paradox', category: 'fragment',
    title: 'The Paradox Warning', icon: '📜', color: '#88ff44',
    author: 'Keeper Elys', location: 'The Fold',
    era: 'Year 47', discoveryCondition: 'Reach prestige 5',
    text: 'A paradox is not an error. It is a scar. Every time you alter the past, the universe remembers. The scars accumulate. One day, the universe will not forgive.',
  },
  {
    id: 'frag_omega', category: 'fragment',
    title: 'Omega Prophecy', icon: '📜', color: '#ff4444',
    author: 'Oracle of Ends', location: 'The End of Time',
    era: 'Far Future', discoveryCondition: 'Reach prestige 20',
    text: 'When the final Chronarch ascends, the timelines will collapse into one. The Omega Point. Neither beginning nor end — simply the moment all possibilities converge. CHRONOS awaits.',
  },
  // ── Ruins ──
  {
    id: 'ruin_temple', category: 'ruin',
    title: 'Temple of Seconds', icon: '🏛️', color: '#ffaa44',
    author: 'Unknown Architect', location: 'Desert of Hours',
    era: 'Pre-Time', discoveryCondition: 'Build 50 buildings',
    text: 'A temple dedicated to the smallest unit of time. Every second is a room. Every minute is a corridor. The temple has 86,400 rooms — one for each second in a day. None have explored them all.',
  },
  {
    id: 'ruin_observatory', category: 'ruin',
    title: 'Chrono Observatory', icon: '🔭', color: '#44aaff',
    author: 'Astronomer Vell', location: 'Peak of Eternity',
    era: 'Year 312', discoveryCondition: 'Collect 500 time orbs',
    text: 'From here, you can see all timelines simultaneously. Most go mad within minutes. Vell lasted three days, enough to map 1,000,000 possible futures. Only 12,481 end in victory.',
  },
  {
    id: 'ruin_forge', category: 'ruin',
    title: 'The Temporal Forge', icon: '⚒️', color: '#ff8844',
    author: 'Master Smith Korr', location: 'Heart of the Chronoverse',
    era: 'Year 189', discoveryCondition: 'Craft 50 items',
    text: 'Korr forged weapons that could cut through time itself. His masterpiece, the Chrono Blade, exists in every timeline simultaneously. It has never been recovered.',
  },
  // ── Echoes ──
  {
    id: 'echo_war', category: 'echo',
    title: 'Echo of the Time War', icon: '⚔️', color: '#ff6644',
    author: 'General Tarna', location: 'Battlefield of Moments',
    era: 'Year 1,203', discoveryCondition: 'Kill 1000 enemies',
    text: 'I have seen armies erased before they could draw breath. I have seen cities born and die in a single second. War is not hell. War is a broken timeline.',
  },
  {
    id: 'echo_sacrifice', category: 'echo',
    title: 'Echo of Sacrifice', icon: '🕯️', color: '#ff88cc',
    author: 'Mage Ilara', location: 'The Frozen Moment',
    era: 'Year 555', discoveryCondition: 'Prestige 10 times',
    text: 'They said I could save my daughter by stopping time forever. I did. She lives, frozen in a single perfect moment. I have not seen her face in 10,000 years. It was worth it.',
  },
  {
    id: 'echo_regret', category: 'echo',
    title: 'Echo of Regret', icon: '💧', color: '#4488ff',
    author: 'Traveler No. 7', location: 'The Crossroads',
    era: 'Year 777', discoveryCondition: 'Lose 5 expeditions',
    text: 'I went back 7 times. Each time I tried to save them. Each time they died differently. The 8th time, I stayed. Their deaths are part of me now. This is my scar.',
  },
  // ── Diaries ──
  {
    id: 'diary_1', category: 'diary',
    title: 'Diary of a Rookie Chronomancer', icon: '📓', color: '#88ccff',
    author: 'Apprentice Lyra', location: 'The Academy Ruins',
    era: 'Year 23', discoveryCondition: 'Start the game',
    text: 'Day 1: I moved through time today for the first time. It felt like swimming in honey made of stars. My teacher said the nausea passes. I hope she is right.',
  },
  {
    id: 'diary_2', category: 'diary',
    title: 'Diary of a Veteran', icon: '📓', color: '#88ffaa',
    author: 'Master Orin', location: 'The Warped Library',
    era: 'Year 450', discoveryCondition: 'Reach prestige 3',
    text: 'I have lived 450 years in this timeline and 12,000 across all others. I have forgotten more faces than most will ever know. The worst part? I remember every goodbye.',
  },
  {
    id: 'diary_3', category: 'diary',
    title: 'Diary of CHRONOS', icon: '📓', color: '#ff0044',
    author: 'CHRONOS', location: 'The Omega Throne',
    era: 'Beyond Time', discoveryCondition: 'Reach prestige 15',
    text: 'They think I am a god. I am just the one who refused to die. I have seen the heat death of the universe and the birth of the next. Time does not end. Time forgets. I remember.',
  },
  // ── Artifacts ──
  {
    id: 'arti_hourglass', category: 'artifact',
    title: 'Hourglass of Endless Sands', icon: '⏳', color: '#ffd700',
    author: 'Ancient Chronos Cult', location: 'Temple of Seconds',
    era: 'Year 0', discoveryCondition: 'Build 25 buildings',
    text: 'An hourglass that never empties. The sand falls upward. Scholars debate whether it is broken or working in reverse. Either way, it has been falling for eternity.',
  },
  {
    id: 'arti_crown', category: 'artifact',
    title: 'Crown of Forgotten Kings', icon: '👑', color: '#ffaa00',
    author: 'Unknown Ruler', location: 'Throne of Dust',
    era: 'Year 3,450', discoveryCondition: 'Prestige 12 times',
    text: 'The crown is cold to the touch. When worn, you hear the whispers of every ruler who wore it before. They tell you how they fell. They all fell. Power does not protect you.',
  },
  {
    id: 'arti_compass', category: 'artifact',
    title: 'Compass of All Directions', icon: '🧭', color: '#44ddff',
    author: 'Navigator Rell', location: 'The Chrono Sea',
    era: 'Year 600', discoveryCondition: 'Win 100 races',
    text: 'A compass that points not north, but toward your greatest regret. Rell used it to find every mistake he ever made. He visited them all. He never smiled again.',
  },
]

let _discoveredLore: Set<string> = new Set()

export function getAllLore(): LoreEntry[] {
  return [...LORE]
}

export function getDiscoveredLoreIds(): string[] {
  return Array.from(_discoveredLore)
}

export function getDiscoveredLore(): LoreEntry[] {
  return LORE.filter((l) => _discoveredLore.has(l.id))
}

export function getLoreCompletion(): number {
  return _discoveredLore.size / LORE.length
}

export function getLoreCount(): { total: number; discovered: number } {
  return { total: LORE.length, discovered: _discoveredLore.size }
}

/** Discover a lore entry by ID — returns false if already discovered */
export function discoverLore(id: string): boolean {
  const entry = LORE.find((l) => l.id === id)
  if (!entry) return false
  if (_discoveredLore.has(id)) return false
  _discoveredLore.add(id)
  return true
}

/** Condition check — triggers lore discovery based on game state */
export function checkLoreConditions(params: {
  prestigeCount?: number
  buildingsBuilt?: number
  orbsCollected?: number
  itemsCrafted?: number
  kills?: number
  racesWon?: number
  expeditionsLost?: number
  expeditionsSurvived?: number
}): string[] {
  const newlyDiscovered: string[] = []

  // Always discoverable
  if (discoverLore('diary_1')) newlyDiscovered.push('diary_1')
  if (params.buildingsBuilt && params.buildingsBuilt >= 25 && discoverLore('arti_hourglass')) newlyDiscovered.push('arti_hourglass')
  if (params.buildingsBuilt && params.buildingsBuilt >= 50 && discoverLore('ruin_temple')) newlyDiscovered.push('ruin_temple')
  if (params.orbsCollected && params.orbsCollected >= 500 && discoverLore('ruin_observatory')) newlyDiscovered.push('ruin_observatory')
  if (params.itemsCrafted && params.itemsCrafted >= 50 && discoverLore('ruin_forge')) newlyDiscovered.push('ruin_forge')
  if (params.kills && params.kills >= 1000 && discoverLore('echo_war')) newlyDiscovered.push('echo_war')
  if (params.racesWon && params.racesWon >= 100 && discoverLore('arti_compass')) newlyDiscovered.push('arti_compass')
  if (params.expeditionsLost && params.expeditionsLost >= 5 && discoverLore('echo_regret')) newlyDiscovered.push('echo_regret')

  // Prestige-based
  if (params.prestigeCount) {
    if (params.prestigeCount >= 1 && discoverLore('frag_origin')) newlyDiscovered.push('frag_origin')
    if (params.prestigeCount >= 3 && discoverLore('diary_2')) newlyDiscovered.push('diary_2')
    if (params.prestigeCount >= 5 && discoverLore('frag_paradox')) newlyDiscovered.push('frag_paradox')
    if (params.prestigeCount >= 10 && discoverLore('echo_sacrifice')) newlyDiscovered.push('echo_sacrifice')
    if (params.prestigeCount >= 12 && discoverLore('arti_crown')) newlyDiscovered.push('arti_crown')
    if (params.prestigeCount >= 15 && discoverLore('diary_3')) newlyDiscovered.push('diary_3')
    if (params.prestigeCount >= 20 && discoverLore('frag_omega')) newlyDiscovered.push('frag_omega')
  }

  return newlyDiscovered
}

export function serializeLore(): string[] {
  return Array.from(_discoveredLore)
}

export function loadLore(ids: string[]): void {
  _discoveredLore = new Set(ids)
}
