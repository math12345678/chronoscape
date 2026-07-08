# CHRONOSCAPE — 5-Phase Master Build Plan

*Time as matter. A web sandbox where you harvest it, refine it, and spend it to build, heal, and blow things up.*

---

## Phase 1: World Feel & Player Immersion

**Goal:** The first 30 seconds feel like an actual game, not a tech demo. The world breathes.

### 1.1 Spawn Platform & Arrival Theatre
- A raised stone platform at world origin (0, 0, 0) with inscribed runes
- Player spawns on it looking toward the island
- Faint upward particle glow from the platform edges
- A glowing beacon on the platform that pulses on first load, then fades

### 1.2 Player Shadow
- Dark circle shadow projected beneath the camera (projected to terrain height)
- Follows player movement, grows/shrinks slightly with elevation changes
- Gives the player a sense of grounded presence (currently no visual body at all)

### 1.3 Dynamic Sky with Sun Glow
- Replace static clear color with a hemispherical gradient sky (darker at zenith, lighter at horizon)
- Add a sun billboard (glowing sprite that follows the keyLight position)
- The sun changes color from warm orange at dawn/dusk to cool white at noon to dark blue at night
- Stars twinkle more prominently at night

### 1.4 Enhanced Terrain & Ground Detail
- Terrain vertex colors blend between biome zones: central green → outer brown → coastal tan
- Add subtle ground fog at terrain level for depth
- Player footsteps leave temporary footprint decals (tiny dark circles that fade in 2s)

### 1.5 Ambient Audio Events
- Birdsong: random melodic chirps at intervals when near trees
- Wind gusts: whoosh sound when camera moves fast (falling, sprinting)
- Distant rumble: rare, subtle low-frequency noise that builds atmosphere
- Crickets at night (ambient chirping that intensifies in darkness)

### 1.6 Landmark Gateways
- The Lab entrance gets a shimmering particle curtain (not a solid door, a veiled energy field)
- The Trader's awning has hanging wind chimes that tinkle in the breeze
- The Shrine has a golden lens flare when viewed from certain angles

### Acceptance Criteria for Phase 1
- Player spawns on a visible platform, not floating in void
- Player has a shadow that follows them
- The sky looks like a sky (gradient, dynamic color, sun position matches lighting)
- Ambient sounds play at appropriate intervals
- Each landmark has at least one unique visual flourish

---

## Phase 2: Progression & Goals

**Goal:** The player always knows what to do next and feels rewarded for doing it.

### 2.1 Formula Compendium
- A dedicated screen (press `P` or via Lab) that shows all formulas, their requirements, and descriptions
- Locked formulas show what they unlock (e.g., "???" for undiscovered, hint text like "requires precise calibration")
- Animated progression bars that fill as hits accumulate

### 2.2 Visible Completion Tracker
- Top of inventory panel: a small "Chronoscape Progress: X%" indicator
- Trackable milestones: first harvest, first refine, first build, first heal, first explosion, first trade
- Each milestone fires a celebration toast with a distinct sound

### 2.3 Renown Milestones
- Every 10 Renown: a notification that feels good (gold sparkle, trumpet sound)
- Renown milestones unlock tiers of the shop (not just single items)
- Visual representation of Renown (a bar that fills, not just a number)

### 2.4 Lab Discovery Sequence
- When a formula is discovered: slow-mo effect (timeScale 0.2 for 1.5s), camera shake, particle burst from the Lab beacon visible from anywhere on the island
- A UI panel that expands to show the formula details (art, description, what it unlocks)
- The toast notification persists until dismissed

### 2.5 Tutorial Expansion
- First-time player gets a sequence of 3-4 tooltips triggered by proximity or first-time actions
- "Approach the glowing rift" → "Click to harvest" → "Press R to refine" → "Press 1 to build"
- Each tooltip has a pointing arrow that fades after 8s or on action completion
- Tutorial can be dismissed entirely with a "I know what I'm doing" button

### Acceptance Criteria for Phase 2
- First-time player reaches building within 60 seconds without external help
- Formula discovery feels like a real achievement (cinematic moment)
- Renown accumulation feels rewarding at every tier
- Player can always see what they've accomplished and what's next

---

## Phase 3: NPC Life & World Interaction

**Goal:** NPCs feel like inhabitants, not moving furniture.

### 3.1 NPC-to-NPC Interaction
- When two NPCs wander within close range (< 3 units), they pause and face each other for 2-4 seconds (simulating conversation)
- Speech bubbles show contextual interaction text ("Hello!", "Nice day", "Have you seen the rift?")
- After interaction, they continue their previous behavior

### 3.2 NPC Following
- Clicking an NPC (when not in build mode) with empty hands = "Follow me" command
- Followers trail the player at 3-unit distance, mimicking player movement
- Max 2 followers at once
- Followers continue their normal AI if player stays still > 10s

### 3.3 NPC Variety
- 3 visual body types: tall/thin, short/stocky, average
- Each NPC has an "accessory" item (backpack, scarf, hat variant, staff)
- NPC color palette expands to 20 colors
- Names drawn from a larger pool (50+ names)

### 3.4 Day/Night NPC Behavior
- At night (sun below -15°): NPCs seek shelter near the Lab or Shrine
- They gather around light-emitting landmarks, creating a social hub feel
- At dawn, they spread back out across the island
- NPCs become more chatty at night (more speech bubbles)

### 3.5 NPC Gifting
- Right-clicking a follower NPC (non-hostile) lets you give them resources
- Gift 10 Liquid: NPC's vitality permanently increases by 5
- Gift 5 Crystal: NPC permanently changes color to a bright variant
- Gift triggers a sparkle burst and a thank-you speech bubble

### Acceptance Criteria for Phase 3
- NPCs visibly interact with each other (stop and face each other)
- At least 2 NPCs can follow the player simultaneously
- NPCs have visual variety (different body shapes, accessories, colors)
- Nighttime behavior creates visible social gatherings at landmarks
- Gifting works and produces a satisfying reaction

---

## Phase 4: Building & Destruction Depth

**Goal:** Building feels creative, destruction feels devastating.

### 4.1 Multi-Block Selection
- In build mode, hold left-click and drag to select a rectangular volume
- Selected blocks highlight with a blue wireframe
- Press `Ctrl+C` to copy, `Ctrl+V` to paste the selection
- Pasting shows a ghost of the selection following the crosshair

### 4.2 Block Color Customization
- In the Renown shop: custom color picker for blocks (unlockable for 10 Renown)
- RGB sliders or preset palette (12 colors)
- Applies to all blocks placed until changed
- Blocks in the world don't change retroactively (new ones use selected color)

### 4.3 Named Structure Saves
- A "Save Blueprint" button in the build menu
- Saves the relative positions and types of selected blocks as a JSON string
- Blueprints persist in localStorage
- Load blueprint places a ghost preview, click to confirm

### 4.4 Enhanced Explosions
- Multiple explosion types: standard (radius 3), focused (radius 1.5, more damage), cascade (each destroyed block has X% chance to also explode)
- Explosion particles leave scorch marks on the ground (temporary dark decals)
- Explosion screen shake intensity scales with number of blocks destroyed
- A shockwave ripple effect on the ground that expands outward

### 4.5 Building Stats
- UI panel showing: total blocks placed, current blocks alive, blocks decayed, blocks exploded
- "Proudest Build" tracker: the structure with the highest block count

### Acceptance Criteria for Phase 4
- Can copy and paste a multi-block structure
- Can change block colors from the shop
- Can save and load blueprints
- Explosions feel different based on type and scale
- Building stats give a sense of accomplishment

---

## Phase 5: Meta Progression & Replayability

**Goal:** Players want to start new games or keep playing after the main loop is complete.

### 5.1 Achievement System
- 25+ achievements across all game systems
- Categories: Harvesting, Refining, Building, Combat (detonation), Economy, Exploration, Social
- Achievements persist across sessions (stored in localStorage)
- Achievement UI panel with progress tracking per achievement
- Renown rewards for completing achievement categories

### 5.2 Challenge Rifts
- Special glowing rifts with a purple/black color scheme (distinct from normal rifts)
- Interacting starts a timed challenge:
  - "Harvest 50 Raw in 30 seconds" (rifts spawn rapidly)
  - "Build a 5-block tower in 15 seconds" (pre-placed blocks)
  - "Detonate 3 blocks in one explosion" (pre-built structure)
- Success rewards bonus Renown and formula progress
- 3 challenge rifts spawn at fixed locations around the island

### 5.3 Time Trial Mode
- A "Speed Run" button on the title screen
- Timer starts on first harvest
- Goal: complete the full game loop as fast as possible
- Best time saved to localStorage, displayed on completion
- Leaderboard (local only, Phase 2 could add online)

### 5.4 New Game+
- After discovering all formulas, player can choose "New Game+" from the Lab
- Resets inventory and blocks but keeps: upgrades, shop purchases, achievements, Renown
- All decay rates increased by 25% (harder mode)
- New cosmetic unlock: "Chrono Veteran" color scheme

### 5.5 Secrets & Easter Eggs
- A hidden underground chamber beneath the Shrine (found by mining below it)
- Contains a unique "Chrono Crystal" block that slowly pulses Rainbow Road colors
- A special interaction with an NPC named "Dev" who has developer dialogue
- The Starfield has one star that, if looked at for 5 seconds, triggers a shooting star effect

### Acceptance Criteria for Phase 5
- 25 achievements can be earned and displayed
- Challenge rifts provide a distinct gameplay variant from normal harvesting
- Time trial mode records and displays best times
- New Game+ works with preserved progression
- At least 3 secrets can be discovered by attentive players

---

## Implementation Priority

Build in order: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Each phase builds on the previous one. Test the full game loop after each phase before moving to the next.

## Non-Goals (Stretch)

- Multiplayer (Phase 6 concept)
- Mobile support
- Custom asset pipeline
- WebGL2-only features that break WebGL1 support
- Backend server (all localStorage for now)

## Current State (as of Phase 1 start)

The codebase has the core game loop working: harvest → refine → build → lab → crystallize → detonate → heal → trade. All the visual juice is in place (bloom at 1.8 intensity, three-point lighting with day/night cycle, InstancedMesh for blocks, particle effects for all actions, procedural audio). The codebase is clean with zero TypeScript errors and zero console.log statements.
