import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import type { Exercise } from '../types'
import { ExerciseArtwork } from './ExerciseVisual'

const PAGE_SIZE = 20

/** Receives the complete filtered catalog; only its presentation is paginated. */
export function ProgressiveExerciseList({ exercises, onAdd }: { exercises: Exercise[]; onAdd: (exercise: Exercise) => void }) {
  const [limit, setLimit] = useState(PAGE_SIZE)
  const list = useRef<HTMLDivElement>(null)
  const more = useRef<HTMLButtonElement>(null)
  const shown = Math.min(limit, exercises.length)
  const hasMore = shown < exercises.length
  useEffect(() => {
    if (!hasMore || !list.current || !more.current || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return
      observer.disconnect()
      setLimit(current => current + PAGE_SIZE)
    }, { root: list.current, rootMargin: '0px 0px 120px 0px' })
    observer.observe(more.current)
    return () => observer.disconnect()
  }, [shown, hasMore])

  return <div className="picker-list" ref={list} tabIndex={-1}>
    {exercises.slice(0, shown).map(exercise => <button key={exercise.id} onClick={() => onAdd(exercise)}><ExerciseArtwork exercise={exercise} compact /><span><strong>{exercise.name} {exercise.origin === 'custom' && <span className="manual-badge">Manual</span>}</strong><small>{exercise.group} · {exercise.equipment}</small></span><Plus size={19} /></button>)}
    {!exercises.length && <p className="muted">Nenhum exercício encontrado.</p>}
    {hasMore && <button ref={more} className="picker-load-more" onClick={() => setLimit(current => current + PAGE_SIZE)}>Mostrar mais {Math.min(PAGE_SIZE, exercises.length - shown)}</button>}
    <p className="picker-result-count" role="status" aria-live="polite">{shown} de {exercises.length} exercícios e atividades{!hasMore && exercises.length > 0 ? ' · Fim da lista' : ''}</p>
  </div>
}
