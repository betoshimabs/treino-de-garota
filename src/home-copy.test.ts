import { describe, expect, it } from 'vitest'
import { getWeekdayInvitation, WEEKDAY_INVITATIONS } from './home-copy'

describe('home copy', () => {
  it('has one invitation for every weekday', () => {
    expect(WEEKDAY_INVITATIONS).toHaveLength(7)
    WEEKDAY_INVITATIONS.forEach((invitation) => expect(invitation).toMatch(/^\p{Lu}/u))
  })

  it('uses the weekday returned by the local date', () => {
    WEEKDAY_INVITATIONS.forEach((invitation, weekday) => {
      expect(getWeekdayInvitation({ getDay: () => weekday })).toBe(invitation)
    })
  })
})
