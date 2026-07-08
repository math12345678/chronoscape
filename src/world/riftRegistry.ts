import type { RiftData } from './chunkContent'

const riftMap = new Map<string, RiftData[]>()

export function registerRiftsForChunk(cx: number, cz: number, rifts: RiftData[]) {
  riftMap.set(`${cx},${cz}`, rifts)
}

export function getRiftPositionsForChunk(cx: number, cz: number): RiftData[] {
  return riftMap.get(`${cx},${cz}`) || []
}

export function unregisterChunk(cx: number, cz: number) {
  riftMap.delete(`${cx},${cz}`)
}
