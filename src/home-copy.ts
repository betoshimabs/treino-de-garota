export const WEEKDAY_INVITATIONS = [
  'Domingo no seu ritmo.',
  'Bora começar?',
  'Bora treinar!',
  'Vamos no seu ritmo?',
  'Que tal um treino?',
  'Sextou, bora?',
  'Sábado do seu jeito.',
] as const

export function getWeekdayInvitation(date: Pick<Date, 'getDay'> = new Date()) {
  return WEEKDAY_INVITATIONS[date.getDay()]
}
