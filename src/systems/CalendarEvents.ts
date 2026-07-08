// ── Calendar & Events — in-game date, seasonal events ──────────────

export interface CalendarDate {
  day: number
  month: number
  year: number
  totalDays: number
}

export interface CalendarEvent {
  id: string
  name: string
  description: string
  icon: string
  color: string
  dayRequired: number // day of year (1-365)
  durationDays: number
  active: boolean
  effects: string
  multiplier: number // resource multiplier during event
}

const EVENTS: CalendarEvent[] = [
  {
    id: 'newYear',
    name: 'Time\'s New Year',
    description: 'The timeline resets. Celebrate a fresh cycle.',
    icon: '🎉', color: '#ffd700',
    dayRequired: 1, durationDays: 3,
    active: false,
    effects: '+100% harvest, +50% renown',
    multiplier: 2,
  },
  {
    id: 'springEquinox',
    name: 'Vernal Alignment',
    description: 'The time streams are in balance.',
    icon: '🌸', color: '#44ff88',
    dayRequired: 80, durationDays: 2,
    active: false,
    effects: '+50% block duration',
    multiplier: 1.5,
  },
  {
    id: 'summerSolstice',
    name: 'Solstice of Eternity',
    description: 'The longest day in the chronosphere.',
    icon: '☀️', color: '#ff8844',
    dayRequired: 172, durationDays: 3,
    active: false,
    effects: '+75% fire rate, +50% speed',
    multiplier: 1.75,
  },
  {
    id: 'harvestMoon',
    name: 'Harvest Moon',
    description: 'Temporal rifts glow brighter.',
    icon: '🌕', color: '#ffcc44',
    dayRequired: 265, durationDays: 4,
    active: false,
    effects: '+200% harvest amount',
    multiplier: 3,
  },
  {
    id: 'voidEclipse',
    name: 'Void Eclipse',
    description: 'A rare eclipse empowers void enemies.',
    icon: '🌑', color: '#aa44ff',
    dayRequired: 300, durationDays: 1,
    active: false,
    effects: 'Double enemy loot drops',
    multiplier: 1,
  },
  {
    id: 'winterSolstice',
    name: 'Chrono Stillness',
    description: 'Time slows to a crawl across the realm.',
    icon: '❄️', color: '#44ccff',
    dayRequired: 355, durationDays: 3,
    active: false,
    effects: 'Time Credit rate x3',
    multiplier: 3,
  },
]

// ── State ──────────────────────────────────────────────────

let _calendar: CalendarDate = {
  day: 1,
  month: 1,
  year: 1,
  totalDays: 0,
}

let _activeEvents: CalendarEvent[] = []
let _dayLength: number = 60 // seconds per in-game day
let _timeAccumulator: number = 0
let _eventHistory: string[] = []

/** Initialize the calendar */
export function initCalendar(): void {
  _calendar = { day: 1, month: 1, year: 1, totalDays: 0 }
  _activeEvents = []
  checkEvents()
}

export function getCalendarDate(): CalendarDate {
  return { ..._calendar }
}

export function getActiveEvents(): CalendarEvent[] {
  return [..._activeEvents]
}

export function getEventHistory(): string[] {
  return [..._eventHistory]
}

export function getDayLength(): number {
  return _dayLength
}

export function setDayLength(seconds: number): void {
  _dayLength = Math.max(10, seconds)
}

/** Tick the calendar */
export function tickCalendar(dt: number): void {
  _timeAccumulator += dt

  if (_timeAccumulator >= _dayLength) {
    _timeAccumulator -= _dayLength
    advanceDay()
  }
}

function advanceDay(): void {
  _calendar.totalDays++
  _calendar.day++

  // Month boundaries (30-day months)
  if (_calendar.day > 30) {
    _calendar.day = 1
    _calendar.month++
    if (_calendar.month > 12) {
      _calendar.month = 1
      _calendar.year++
    }
  }

  // Check for event start/end
  checkEvents()
}

function checkEvents(): void {
  const dayOfYear = (_calendar.month - 1) * 30 + _calendar.day

  // End expired events
  _activeEvents = _activeEvents.filter((e) => {
    const eventEndDay = e.dayRequired + e.durationDays - 1
    // Handle year wrap
    if (e.dayRequired > eventEndDay) {
      // Event wraps around year
      return dayOfYear >= e.dayRequired || dayOfYear <= eventEndDay
    }
    return dayOfYear <= eventEndDay
  })

  // Start new events
  for (const event of EVENTS) {
    if (event.dayRequired === dayOfYear) {
      const alreadyActive = _activeEvents.some((e) => e.id === event.id)
      if (!alreadyActive) {
        _activeEvents.push({ ...event, active: true })
        _eventHistory.push(`[Day ${_calendar.totalDays}] ${event.name} begins!`)
      }
    }
  }
}

/** Get the global event multiplier for resources */
export function getEventResourceMultiplier(): number {
  let mult = 1.0
  for (const event of _activeEvents) {
    mult = Math.max(mult, event.multiplier)
  }
  return mult
}

/** Get the global event fire rate multiplier */
export function getEventFireRateMultiplier(): number {
  let mult = 1.0
  for (const event of _activeEvents) {
    if (event.id === 'summerSolstice') mult += 0.75
  }
  return mult
}

/** Get current season name */
export function getSeason(): string {
  const m = _calendar.month
  if (m <= 3) return 'Spring'
  if (m <= 6) return 'Summer'
  if (m <= 9) return 'Fall'
  return 'Winter'
}

/** Format date string */
export function formatCalendarDate(date: CalendarDate): string {
  const monthNames = [
    'Prima', 'Secunda', 'Tertia', 'Quarta', 'Quinta', 'Sexta',
    'Septima', 'Octava', 'Nona', 'Decima', 'Undecima', 'Duodecima',
  ]
  return `${monthNames[date.month - 1]} ${date.day}, Year ${date.year}`
}

/** Get overall progress message */
export function getCalendarProgress(): string {
  const pct = (_calendar.totalDays / 365) * 100
  return `${_calendar.totalDays} days elapsed (${pct.toFixed(1)}% of first year)`
}

export function serializeCalendar(): { calendar: CalendarDate; eventHistory: string[] } {
  return {
    calendar: { ..._calendar },
    eventHistory: [..._eventHistory],
  }
}

export function loadCalendar(data: { calendar: CalendarDate; eventHistory: string[] }): void {
  _calendar = { ...data.calendar }
  _eventHistory = [...(data.eventHistory ?? [])]
  _timeAccumulator = 0
  checkEvents()
}
