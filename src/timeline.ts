import type { TimelineEntry } from './types'

export const MAX_TIMELINE_PHOTOS = 5

export function timelineImages(entry: TimelineEntry): string[] {
  const current = entry.imageDataUrls?.filter(Boolean).slice(0, MAX_TIMELINE_PHOTOS) ?? []
  if (current.length > 0) return current
  return entry.imageDataUrl ? [entry.imageDataUrl] : []
}

export interface TimelineMediaItem {
  id: string
  entryId: string
  source: string
  occurredAt: string
  position: number
  totalInEntry: number
}

export function timelineMedia(entries: TimelineEntry[]): TimelineMediaItem[] {
  return entries.flatMap((entry) => {
    const images = timelineImages(entry)
    return images.map((source, index) => ({
      id: `${entry.id}:${index}`,
      entryId: entry.id,
      source,
      occurredAt: entry.occurredAt,
      position: index + 1,
      totalInEntry: images.length,
    }))
  })
}
