import { auth } from './firebase'
import { db } from './db'
import { cleanManualDraft, manualExercise, type ManualDraft } from './manual-exercise-data'

const running = new Set<string>()
const deleting = new Set<string>()
export async function createManualExercise(draft: ManualDraft) {
  const ownerUid = auth.currentUser?.uid
  if (!ownerUid || deleting.has(ownerUid)) throw new Error('Entre na sua conta para criar um exercício.')
  const database = db
  const clean = cleanManualDraft(draft)
  const id = `custom-${crypto.randomUUID()}`
  const exercise = manualExercise(id, clean)
  await database.transaction('rw', database.customExercises, database.manualOutbox, async () => {
    await database.customExercises.add(exercise)
    await database.manualOutbox.add({ id, ownerUid, exercise: clean, attempts: 0, nextAttempt: 0 })
  })
  if (auth.currentUser?.uid !== ownerUid || db !== database) throw new Error('A conta mudou. O cadastro ficou salvo na conta anterior.')
  void syncManualExercises()
  return exercise
}

export async function syncManualExercises() {
  const ownerUid = auth.currentUser?.uid
  if (!ownerUid || running.has(ownerUid) || deleting.has(ownerUid) || !navigator.onLine) return
  const database = db
  running.add(ownerUid)
  try {
    const { getFirestore, doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore/lite')
    const firestore = getFirestore(auth.app)
    const jobs = await database.manualOutbox.where('ownerUid').equals(ownerUid).toArray()
    for (const job of jobs) {
      if (auth.currentUser?.uid !== ownerUid || db !== database || deleting.has(ownerUid)) break
      if (job.sent || job.nextAttempt > Date.now()) continue
      try {
        const reference = doc(firestore, 'users', ownerUid, 'exerciseSubmissions', job.id)
        const existing = await getDoc(reference)
        if (auth.currentUser?.uid !== ownerUid || db !== database || deleting.has(ownerUid)) break
        if (!existing.exists()) {
          await setDoc(reference, { exercise: cleanManualDraft(job.exercise), status: 'pending', createdAt: serverTimestamp() })
        }
        await database.manualOutbox.update(job.id, { sent: true })
        window.dispatchEvent(new Event('manual-submissions-changed'))
      } catch {
        if (db !== database || auth.currentUser?.uid !== ownerUid) break
        await database.manualOutbox.update(job.id, { attempts: job.attempts + 1, nextAttempt: Date.now() + Math.min(300_000, 15_000 * 2 ** Math.min(job.attempts, 5)) })
        window.dispatchEvent(new Event('manual-submissions-changed'))
      }
    }
  } catch { /* Local registration stays usable; retry on next online/timer event. */ }
  finally { running.delete(ownerUid) }
}

/** Called while still authenticated; failure stops account deletion rather than orphaning submissions. */
export async function deleteManualSubmissions() {
  const ownerUid = auth.currentUser?.uid
  if (!ownerUid) return
  deleting.add(ownerUid)
  const database = db
  try {
    const deadline = Date.now() + 30_000
    while (running.has(ownerUid)) {
      if (Date.now() > deadline) throw new Error('Aguarde o envio terminar e tente excluir novamente.')
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    const { getFirestore, collection, getDocs, deleteDoc } = await import('firebase/firestore/lite')
    const snapshot = await getDocs(collection(getFirestore(auth.app), 'users', ownerUid, 'exerciseSubmissions'))
    for (const item of snapshot.docs) await deleteDoc(item.ref)
    await database.manualOutbox.clear()
  } finally { deleting.delete(ownerUid) }
}
