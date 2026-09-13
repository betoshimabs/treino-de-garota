import { useEffect, useId, useRef } from 'react'
import { ArrowLeft, ChevronDown, Heart, Info, X } from 'lucide-react'
import type { Exercise } from '../types'
import { ExerciseArtwork } from './ExerciseVisual'
import { MuscleMap } from './MuscleMap'

type DetailProps = { exercise: Exercise; favorite: boolean; onToggleFavorite: () => void; onClose: () => void; modal?: boolean }

/** The library and workout dialog render this same complete exercise sheet. */
export function ExerciseDetailView({ exercise, favorite, onToggleFavorite, onClose, modal = false }: DetailProps) {
  const titleId = useId()
  return (
    <div className="page detail-page">
      <header className="detail-top">
        <button className="icon-button" aria-label={modal ? 'Fechar detalhes' : 'Voltar'} onClick={onClose}>{modal ? <X /> : <ArrowLeft />}</button>
        <button className="icon-button soft" aria-label={favorite ? 'Desfavoritar' : 'Favoritar'} onClick={onToggleFavorite}><Heart fill={favorite ? 'currentColor' : 'none'} /></button>
      </header>
      <p className="eyebrow">{exercise.group} · {exercise.equipment}</p>
      <h1 id={titleId}>{exercise.name}</h1>
      <div className={`detail-illustration${exercise.media ? ' has-media' : ''}`}>
        <ExerciseArtwork exercise={exercise} />
        <small>{exercise.analysis?.kind === 'session' ? 'Cena representativa da atividade' : exercise.media ? 'Início e execução' : 'Ilustração demonstrativa em preparação'}</small>
      </div>
      {exercise.curation && (
        <section className="exercise-facts" aria-labelledby={`${titleId}-facts`}>
          <div className="exercise-facts-heading">
            <div><p className="eyebrow">Um olhar rápido</p><h2 id={`${titleId}-facts`}>Sobre o exercício</h2></div>
            {exercise.curation.reviewStatus === 'em-revisao' && <small>Conteúdo em revisão</small>}
          </div>
          <dl>
            <div><dt>Padrão</dt><dd>{exercise.curation.movementPattern}</dd></div>
            {exercise.analysis && <div><dt>Familiaridade sugerida</dt><dd>{exercise.analysis.familiarity}</dd></div>}
            {exercise.analysis && <div><dt>Foco</dt><dd>{exercise.analysis.focus}</dd></div>}
          </dl>
        </section>
      )}
      {exercise.curation && exercise.analysis?.kind !== 'session' && <MuscleMap key={exercise.id} curation={exercise.curation} />}
      {exercise.editorial && <section className="exercise-editorial"><h2>Antes de começar</h2><p>{exercise.editorial.setup}</p><p>{exercise.editorial.care}</p><h3>Como registrar</h3><p>{exercise.editorial.recordingHint}</p><small>Familiaridade é uma classificação editorial da execução, não uma avaliação da sua capacidade.</small></section>}
      <section>
        <p className="eyebrow">Um passo de cada vez</p>
        <ol className="instruction-list">{exercise.instructions.map((instruction, index) => <li key={instruction}><span>{index + 1}</span><p>{instruction}</p></li>)}</ol>
      </section>
      <aside className="care-note"><Info size={18} /><p>A demonstração ajuda a reconhecer o movimento, mas não mostra todos os ajustes. Use como referência geral; ela não substitui orientação profissional.</p></aside>
      {exercise.curation && <p className="exercise-attribution">Dados adaptados de <a href={exercise.curation.source.url} target="_blank" rel="noreferrer">{exercise.curation.source.name}</a> · {exercise.curation.source.license}</p>}
      {exercise.editorial && <details className="evolution-details"><summary>Referências e revisão <ChevronDown size={17} /></summary><p className="muted">Conteúdo em constante revisão e validação por profissional.</p><ul>{exercise.editorial.references.map(reference => <li key={reference.url}><a href={reference.url} target="_blank" rel="noreferrer">{reference.name}</a></li>)}</ul></details>}
    </div>
  )
}

export function ExerciseDetailModal(props: DetailProps) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!
    const trigger = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      queueMicrotask(() => { if (!dialog.isConnected && trigger?.isConnected) trigger.focus() })
    }
  }, [])
  return <dialog ref={ref} className="exercise-detail-dialog" aria-label={props.exercise.name} onCancel={props.onClose} onClick={event => { if (event.target === event.currentTarget) props.onClose() }}>
    <ExerciseDetailView {...props} modal />
  </dialog>
}
