import { Pause, Play } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Exercise, ExerciseMedia, ExerciseVisual as VisualName } from '../types'

type Props = { visual: VisualName; label: string; compact?: boolean }

const body = { fill: 'none', stroke: 'currentColor', strokeWidth: 4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export function ExerciseVisual({ visual, label, compact = false }: Props) {
  return (
    <div className={compact ? 'exercise-visual compact' : 'exercise-visual'} role="img" aria-label={`Ilustração simplificada de ${label}`}>
      <svg viewBox="0 0 160 120" aria-hidden="true">
        <path d="M18 104h124" {...body} opacity=".2" />
        {visual === 'squat' && <><circle cx="79" cy="28" r="9" {...body} /><path d="M78 38l-9 28 27 13m-27-13-22 19m49-6 24 18M42 49h76M54 45v9m52-9v9" {...body} /></>}
        {visual === 'press' && <><circle cx="78" cy="33" r="9" {...body} /><path d="M78 42v38m0-28-25-22m25 22 25-22M48 25h60m-55-6v12m50-12v12M78 80l-18 24m18-24 20 24" {...body} /></>}
        {visual === 'hinge' && <><circle cx="55" cy="34" r="9" {...body} /><path d="M62 40l38 27m-20-14-20 33m40-19 23 35M60 86l-22 17M37 73h86m-78-7v14m70-14v14" {...body} /></>}
        {visual === 'bridge' && <><circle cx="42" cy="72" r="9" {...body} /><path d="M51 73l39-29 29 31M90 44l-7 39m-32-10-18 26m86-24 15 25M25 81h28" {...body} /></>}
        {visual === 'lunge' && <><circle cx="78" cy="24" r="9" {...body} /><path d="M78 34v37m0-23-22 15m22-15 20 14M78 71 48 88l-20 15m50-32 30 28h25" {...body} /></>}
        {visual === 'pull' && <><circle cx="75" cy="32" r="9" {...body} /><path d="M75 42v39m0-28-27-10m27 10 28-10M48 43l-9-23m64 23 9-23M38 18h76M75 81l-18 23m18-23 20 23" {...body} /></>}
        {visual === 'raise' && <><circle cx="79" cy="31" r="9" {...body} /><path d="M79 41v40m0-27L42 41m37 13 38-13M37 37l10 8m75-8-10 8M79 81l-19 23m19-23 19 23" {...body} /></>}
        {visual === 'curl' && <><circle cx="79" cy="30" r="9" {...body} /><path d="M79 40v42m0-28-22 11-8-21m30 10 22 11 8-21M43 42h13m46 0h13M79 82l-18 22m18-22 19 22" {...body} /></>}
        {visual === 'plank' && <><circle cx="121" cy="63" r="8" {...body} /><path d="M113 66 78 74 43 69m35 5 21 27m-56-32-20 28m70 4h19M19 99h31" {...body} /></>}
        {visual === 'walk' && <><circle cx="76" cy="24" r="9" {...body} /><path d="M76 34 68 68m4-18 27 17M70 52 48 70m20-2-22 35m22-35 30 30M25 104h108" {...body} /><path d="M120 37c9 8 12 18 11 31" {...body} opacity=".35" /></>}
        {visual === 'cycle' && <><circle cx="45" cy="85" r="24" {...body} /><circle cx="116" cy="85" r="24" {...body} /><circle cx="82" cy="27" r="8" {...body} /><path d="M77 35 64 60l18 18m-18-18h36l16 25M82 78 45 85l21-39m16 32 34 7M100 60l-8-22h17" {...body} /></>}
        {visual === 'flow' && <><circle cx="80" cy="28" r="9" {...body} /><path d="M80 38v41m0-28L52 63m28-12 29 12M80 79 52 102m28-23 28 23" {...body} /><path d="M31 31c8-9 18-15 30-18m68 18c-8-9-18-15-30-18" {...body} opacity=".35" /></>}
      </svg>
    </div>
  )
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function ExerciseMotion({ media }: { media: ExerciseMedia }) {
  const [reduceMotion, setReduceMotion] = useState(prefersReducedMotion)
  const [playing, setPlaying] = useState(() => !prefersReducedMotion())

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => {
      setReduceMotion(query.matches)
      if (query.matches) setPlaying(false)
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return (
    <div className="exercise-motion">
      <img
        src={playing ? media.motionSrc : media.posterSrc}
        alt={media.alt}
        width="768"
        height="512"
        loading="eager"
        decoding="async"
      />
      <button type="button" className="exercise-motion-toggle" aria-pressed={playing} onClick={() => setPlaying((current) => !current)}>
        {playing ? <Pause size={16} /> : <Play size={16} />}
        <span>{playing ? 'parar movimento' : reduceMotion ? 'ver movimento mesmo assim' : 'ver movimento'}</span>
      </button>
    </div>
  )
}

export function ExerciseArtwork({ exercise, compact = false }: { exercise: Exercise; compact?: boolean }) {
  if (!exercise.media) return <ExerciseVisual visual={exercise.visual} label={exercise.name} compact={compact} />

  if (compact) {
    return (
      <div className="exercise-visual exercise-media compact" aria-hidden="true">
        <img src={exercise.media.posterSrc} alt="" width="768" height="512" loading="lazy" decoding="async" />
      </div>
    )
  }

  return <ExerciseMotion media={exercise.media} />
}
