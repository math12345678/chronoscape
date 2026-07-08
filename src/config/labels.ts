/**
 * Biomedical display labels for Chronoscape.
 *
 * Maps internal game identifiers to research-themed display names.
 * All UI panels should use these labels instead of hardcoded strings.
 */

// ── Resource Labels ────────────────────────────────────

export const RESOURCE_LABELS: Record<string, { label: string; shortLabel: string; description: string; unit: string }> = {
  raw: {
    label: 'Biopsied Sample',
    shortLabel: 'Sample',
    description: 'Raw biological data — sequence it before it degrades',
    unit: 'bp',
  },
  vapour: {
    label: 'Transcriptome',
    shortLabel: 'Transcript',
    description: 'Gene expression data — builds temporary experimental constructs',
    unit: 'tx',
  },
  liquid: {
    label: 'Serum',
    shortLabel: 'Serum',
    description: 'Stable biomarker — heals subjects and trades for citations',
    unit: 'mL',
  },
  crystal: {
    label: 'Crystal Structure',
    shortLabel: 'Structure',
    description: 'Published structural data — permanent research output',
    unit: 'Å',
  },
}

// ── State Labels ───────────────────────────────────────

export const STATE_LABELS: Record<string, string> = {
  raw: 'Biopsied Sample',
  vapour: 'Transcriptome',
  liquid: 'Serum',
  crystal: 'Crystal Structure',
}

// ── System Labels ───────────────────────────────────────

export const SYSTEM_LABELS = {
  game: 'Chronoscape',
  gameSubtitle: 'Time as matter — a bioinformatics sandbox',

  // Core loop
  harvest: 'Sequence',
  harvestDesc: 'Sequence raw biological data from time rifts',
  refine: 'Analyze',
  refineDesc: 'Process samples into usable research outputs',
  build: 'Construct',
  buildDesc: 'Assemble transcriptome constructs in the real world',

  // Renown → Citations
  renown: 'Citations',
  renownDesc: 'Academic citations — measure of research impact',
  renownUnit: 'cite',
  renownTier: 'H-Index Tier',

  // Lab → Research Core
  lab: 'Research Core',
  labDesc: 'Advanced analysis facility — run experiments to discover new hypotheses',

  // Formula → Hypothesis
  formula: 'Hypothesis',
  formulaPlural: 'Hypotheses',
  formulaDesc: 'Discover all hypotheses to unlock the full research program',
  formulaDiscovered: 'Hypothesis Confirmed',
  formulaProgress: 'Research Progress',

  // Shrine → Grant Office
  shrine: 'Grant Office',
  shrineDesc: 'Invest sample mass to fund research equipment upgrades',

  // Trader → Publisher
  trader: 'Publisher',
  traderDesc: 'Exchange research data for citations in peer-reviewed journals',

  // NPC → Subject
  npc: 'Subject',
  npcPlural: 'Subjects',

  // Block → Construct
  blockVapour: 'Transcript Construct',
  blockCrystal: 'Structural Model',

  // Original identifiers
  raw: 'Biopsied Sample',
  vapour: 'Transcriptome',
  liquid: 'Serum',
  crystal: 'Crystal Structure',
}

// ── Milestone Labels ───────────────────────────────────

export const MILESTONE_LABELS: Record<string, string> = {
  first_harvest: 'First Sequence',
  first_refine: 'First Analysis',
  first_build: 'First Construct',
  first_heal: 'First Treatment',
  first_trade: 'First Publication',
  first_explosion: 'First Denaturation',
}

// ── Harvest / Sequence ─────────────────────────────────

export const SEQUENCE_LABELS = {
  action: '[Click] Sequence',
  actionShort: 'Sequence',
  amount: 'bp sequenced',
  stream: 'Sequencing data...',
}

// ── Achievements ───────────────────────────────────────

export const ACHIEVEMENT_LABELS: Record<string, string> = {
  Harvesting: 'Sequencing',
  Refining: 'Analysis',
  Building: 'Construct Assembly',
  Destruction: 'Denaturation',
  Economy: 'Publishing',
  Exploration: 'Discovery',
  Social: 'Collaboration',
}

// ── Tooltip / Helper ───────────────────────────────────

export function getResourceLabel(key: string): string {
  return RESOURCE_LABELS[key]?.label ?? key
}

export function getResourceShortLabel(key: string): string {
  return RESOURCE_LABELS[key]?.shortLabel ?? key
}

export function getResourceUnit(key: string): string {
  return RESOURCE_LABELS[key]?.unit ?? ''
}
