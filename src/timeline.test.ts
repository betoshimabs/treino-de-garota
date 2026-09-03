import { describe, expect, it } from 'vitest'
import { MAX_TIMELINE_PHOTOS, timelineImages, timelineMedia } from './timeline'
import type { TimelineEntry } from './types'

const entry = (partial: Partial<TimelineEntry>): TimelineEntry => ({
  id: 'entry-1',
  kind: 'photo',
  occurredAt: '2026-09-03T12:00:00.000Z',
  title: 'Um registro de hoje',
  isMilestone: false,
  ...partial,
})

describe('mídias da linha', () => {
  it('preserva a foto única de registros antigos', () => {
    expect(timelineImages(entry({ imageDataUrl: 'legacy' }))).toEqual(['legacy'])
  })

  it('prefere a coleção atual e limita a cinco fotos', () => {
    const sources = Array.from({ length: MAX_TIMELINE_PHOTOS + 2 }, (_, index) => `foto-${index}`)
    expect(timelineImages(entry({ imageDataUrl: 'legacy', imageDataUrls: sources }))).toEqual(sources.slice(0, 5))
  })

  it('transforma todas as fotos em itens individuais de galeria', () => {
    const items = timelineMedia([entry({ imageDataUrls: ['a', 'b'] })])
    expect(items).toMatchObject([
      { id: 'entry-1:0', entryId: 'entry-1', source: 'a', position: 1, totalInEntry: 2 },
      { id: 'entry-1:1', entryId: 'entry-1', source: 'b', position: 2, totalInEntry: 2 },
    ])
  })
})
