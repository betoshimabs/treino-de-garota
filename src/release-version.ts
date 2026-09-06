// Change the release series only after an explicit instruction from the owner.
export const RELEASE_SERIES = '0.1'

/** A timestamp distinguishes multiple releases on the same day, including CI. */
export function releaseVersion(builtAt: string): string {
  const date = new Date(builtAt)
  if (Number.isNaN(date.getTime())) throw new Error('Data de publicação inválida')
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const stamp = ['year', 'month', 'day', 'hour', 'minute', 'second']
    .map((name) => parts.find((part) => part.type === name)!.value).join('')
  return `v${RELEASE_SERIES}.${stamp}`
}
