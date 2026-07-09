# Chronoscape

*Time as matter. A web sandbox where you harvest it, refine it, and spend it to build, heal, and blow things up.*

Chronoscape is a first-person 3D browser game built with React Three Fiber. Harvest raw Epoch from glowing Time Rifts, refine it into Chrono blocks, build and detonate structures, fight off Wraiths and bosses, drive a hover vehicle, and grind through dozens of interlocking progression systems (Talents, Ascension, Relic Forging, Research Lab, Companions, Mega Structures, and more).

## Running it

Requires [Node.js](https://nodejs.org/) 18+ and npm.

```bash
npm install
npm run dev
```

Then open **http://localhost:5173** in a browser (Chrome/Edge recommended — the game relies on the Pointer Lock API for mouse-look, which some browsers restrict). Click the "Click to enter the chronoscape" prompt to lock the pointer and start playing.

### Other scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server (frontend only) |
| `npm run dev:server` | Start the optional backend (cloud save + leaderboard) on port 3001 |
| `npm run dev:all` | Run both frontend and backend together |
| `npm run build` | Typecheck (`tsc -b`) and produce a production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run oxlint |

### The backend is optional

The game saves entirely to `localStorage` and works fully offline. The backend (`server/`, a small Hono + SQLite server) is only used for a best-effort cloud save sync and the drag-race leaderboard — if it isn't running, the game falls back to local-only saves silently. If you do want it, run `npm run dev:all` (or `npm run dev:server` separately) and it'll listen on `http://localhost:3001`; no environment variables are required for local use.

## How to play

**Objective:** there's no single win condition — it's an open-ended sandbox/idle-progression hybrid. Harvest resources, refine them into more valuable forms, discover formulas, build with blocks, fight enemies, unlock and invest in the dozens of progression systems, and see how far you can push your economy and combat power.

### Controls

| Key | Action |
|---|---|
| `W A S D` | Move |
| Mouse | Look around |
| Left click | Interact (harvest a rift, talk to an NPC, hit an enemy in melee range, etc.) |
| `Hold Q` | Fire your equipped weapon (auto-fires at your weapon's effective fire rate while held) |
| Scroll wheel | Cycle equipped weapon |
| `R` | Open the Refine panel — convert raw Epoch into Chrono blocks |
| `1` / `2` | Select a block type to build with, then left-click the ground to place |
| `H` | Heal (costs Liquid) |
| `V` | Enter/exit your hover vehicle |
| `Space` | Jump (on foot) / brake (in the vehicle) |
| `Tab` | Open the game menu — every unlocked system (Inventory, Trade, Crafting, Talents, Research Lab, Relic Forge, Ascension, etc.) lives here, organized by category and gated by progress tier |
| `Esc` | Pause |

While driving the hover vehicle: `W/S` accelerate/reverse, `A/D` steer, `Shift` boosts, `Q` fires the vehicle's cannons, `Space` brakes.

### Progression loop

1. **Harvest** raw Epoch from the glowing Time Rifts scattered around the island.
2. **Refine** (`R`) it into Chrono blocks (Vapour → later Crystal, once you discover the Crystallization formula).
3. **Build** with those blocks, or **trade** them for Renown.
4. Renown and formula discoveries unlock new systems in the `Tab` menu — Combat (weapons, Talents, Bestiary), Economy (Crafting, Time Bank, Real Estate, Auction), and Progression (Research Lab, Relic Forge, Ascension, Mega Structures) all gate in as you advance.
5. Fight enemies for loot, Renown, and Relic Forge materials; drive the hover vehicle to cover ground fast and race other players' times; eventually Ascend to reset with permanent multiplicative bonuses.

The first-time tutorial (a sequence of proximity/action-triggered tooltips) walks you through the first few steps automatically.

## Development notes

- Built with React 19, React Three Fiber / drei / postprocessing, Zustand for state, Tailwind for UI chrome, and Vite for bundling.
- `npm run build` runs a full TypeScript project build before bundling — treat a red `tsc` as a real error, not a warning.
- Game state persists to `localStorage` (key `chronoscape-save`) and auto-saves every 30s plus on tab-hide/close.
