import { useEffect, useState } from 'react'

const motionBase = `${import.meta.env.BASE_URL}brand-motion/`

/** Release the opening only when the next usable screen has mounted. */
export function useOpeningReady(ready = true) {
  useEffect(() => {
    if (ready) window.dispatchEvent(new Event('brabita-ready'))
  }, [ready])
}

export function BrandMotion() {
  const [still, setStill] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setStill(preference.matches)
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
  return <span className="brand-motion" aria-hidden="true">
    <img src={`${motionBase}${still ? 'opening-poster.webp' : 'opening.webp'}`}
      width="1080" height="720" alt="" onError={() => setStill(true)} />
  </span>
}

export function BrandLoading({ text = 'Abrindo seu diário…', inline = false }: { text?: string; inline?: boolean }) {
  return <div className={`brand-loading${inline ? ' is-inline' : ''}`} role="status" aria-live="polite">
    <BrandMotion /><p>{text}</p>
  </div>
}
