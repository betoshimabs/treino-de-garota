import { useEffect, useState } from 'react'
import { db } from '../db'
import type { ManualSubmission } from '../manual-exercise-data'
import { syncManualExercises } from '../manual-exercises'

export function ManualSubmissionStatus({ exerciseId }: { exerciseId: string }) {
  const [job, setJob] = useState<ManualSubmission>()
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let mounted = true
    const database = db
    const update = () => { void database.manualOutbox.get(exerciseId).then(value => { if (mounted) setJob(value) }).catch(() => {}) }
    update(); window.addEventListener('manual-submissions-changed', update)
    return () => { mounted = false; window.removeEventListener('manual-submissions-changed', update) }
  }, [exerciseId])
  if (!job) return null
  return <div className="manual-submission-status"><p role="status">{job.sent ? 'Ficha recebida para possível revisão. Continua privada.' : job.attempts ? 'Não conseguimos enviar ainda. Seu exercício está salvo neste aparelho.' : 'Salvo neste aparelho. Envio para revisão pendente.'}</p>{!job.sent && <button className="text-button" disabled={busy} onClick={async () => { setBusy(true); try { await db.manualOutbox.update(exerciseId, { nextAttempt: 0 }); await syncManualExercises() } finally { setBusy(false) } }}>{busy ? 'Tentando enviar…' : 'Tentar envio agora'}</button>}</div>
}
