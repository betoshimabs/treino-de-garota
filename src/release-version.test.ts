import { describe, expect, it } from 'vitest'
import { releaseVersion } from './release-version'

describe('Release version', () => {
  it('keeps the approved series and uses the date in São Paulo, even across UTC midnight', () => {
    expect(releaseVersion('2026-09-06T02:59:59Z')).toBe('v0.1.20260905235959')
    expect(releaseVersion('2026-09-06T03:00:00Z')).toBe('v0.1.20260906000000')
  })
  it('distinguishes successive publications on the same day', () => {
    expect(releaseVersion('2026-09-06T12:01:01Z')).not.toBe(releaseVersion('2026-09-06T12:01:02Z'))
  })
})
