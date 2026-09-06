import script from '../public/brand-motion/opening.js?raw'
import { describe, expect, it } from 'vitest'

function openingFixture(reduced = false) {
  const events: Record<string, () => void> = {}
  const timers: { run: () => void; delay: number }[] = []
  const state = { removed: false, inert: true, recovery: true, animationHidden: false }
  const animation = {
    complete: false,
    set hidden(value: boolean) { state.animationHidden = value },
    addEventListener: (name: string, run: () => void) => { events[name] = run },
  }
  const recovery = { set hidden(value: boolean) { state.recovery = value } }
  const opening = {
    querySelector: (selector: string) => selector === '[data-opening-animation]' ? animation : selector === '[data-opening-poster]' ? { hidden: true } : selector === 'button' ? { addEventListener() {} } : recovery,
    classList: { add() {} }, remove: () => { state.removed = true },
  }
  const environment = {
    document: { getElementById: (id: string) => id === 'app-opening' ? opening : { removeAttribute: () => { state.inert = false } } },
    window: { addEventListener: (name: string, run: () => void) => { events[name] = run } },
    matchMedia: () => ({ matches: reduced }),
    setTimeout: (run: () => void, delay: number) => timers.push({ run, delay }),
    location: { reload() {} },
  }
  new Function(...Object.keys(environment), script)(...Object.values(environment))
  return { state, events, tick: (delay: number) => timers.filter((timer) => timer.delay === delay).forEach((timer) => timer.run()) }
}

describe('Opening handoff', () => {
  it('keeps a ready app covered until the animation ends', () => {
    const f = openingFixture()
    f.events['brabita-ready']()
    f.tick(300)
    expect(f.state.inert).toBe(true)
    f.events.load()
    f.tick(2500)
    f.tick(300)
    expect(f.state).toMatchObject({ removed: true, inert: false })
  })

  it('holds the final frame while the app is still loading', () => {
    const f = openingFixture()
    f.events.load()
    f.tick(2500)
    f.tick(300)
    expect(f.state).toMatchObject({ removed: false, animationHidden: true, inert: true })
    f.events['brabita-ready']()
    f.tick(300)
    expect(f.state.removed).toBe(true)
  })

  it('releases a ready app even when the decoder stalls', () => {
    const f = openingFixture()
    f.events['brabita-ready']()
    f.tick(4000)
    f.tick(300)
    expect(f.state).toMatchObject({ removed: true, inert: false })
  })

  it('offers recovery without hiding a failed initialization', () => {
    const f = openingFixture()
    f.events.error()
    f.tick(15000)
    expect(f.state).toMatchObject({ recovery: false, removed: false })
  })

  it('does not wait for playback with reduced motion', () => {
    const f = openingFixture(true)
    f.events['brabita-ready']()
    f.tick(0)
    expect(f.state).toMatchObject({ removed: true, inert: false, animationHidden: true })
  })
})
