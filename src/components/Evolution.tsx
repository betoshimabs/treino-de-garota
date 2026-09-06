import { useMemo, useState } from 'react'
import { ArrowUpRight, ChevronDown, Info } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import type { AppSnapshot, Exercise, MuscleRegionId } from '../types'
import { dayKey, exerciseSeries, periodDays, periodSummary, regionDistribution, selectPeriod, validCompleted, type ProgressMetric } from '../evolution'
import { loadConventionLabels } from '../data/catalog-review'
import { bodyOutline, frontPatches, backPatches } from './muscle-geometry'
import '../evolution.css'

const number = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
const dateLabel = (date: string) => new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
const timeLabel = (seconds: number) => seconds < 60 ? `${Math.round(seconds)} s` : `${Math.floor(seconds / 60)} min${seconds % 60 ? ` ${Math.floor(seconds % 60)} s` : ''}`
const metricLabels: Record<ProgressMetric, string> = { load: 'Carga', reps: 'Repetições', distance: 'Distância', duration: 'Tempo registrado', pace: 'Ritmo médio' }

/** The overview answers when, what, and how much was recorded; it does not score health. */
export function Evolution({ data, exercises, now = new Date() }: { data: AppSnapshot; exercises: Exercise[]; now?: Date }) {
  const [period, setPeriod] = useState(28)
  const [selected, setSelected] = useState('')
  const [metric, setMetric] = useState<ProgressMetric>()
  const [selectedRegion, setSelectedRegion] = useState<MuscleRegionId>()
  const [includeSupport, setIncludeSupport] = useState(false)
  const today = dayKey(now)
  const workouts = useMemo(() => selectPeriod(data.workouts, period, new Date(`${today}T12:00:00`)), [data.workouts, period, today])
  const summary = periodSummary(workouts)
  const regions = regionDistribution(workouts, exercises)
  const used = [...new Set(workouts.flatMap(workout => workout.items.filter(item => item.sets.some(set => validCompleted(item, set))).map(item => item.exerciseId)))]
  const selectedId = used.includes(selected) ? selected : used.find(id => data.favorites.includes(id)) ?? used[0] ?? ''
  const exercise = exercises.find(row => row.id === selectedId)
  const itemName = workouts.flatMap(workout => workout.items).find(item => item.exerciseId === selectedId)?.exerciseName
  const available: ProgressMetric[] = ['load', 'reps', 'distance', 'duration', 'pace']
  const currentMetric = metric ?? (exercise?.metricMode === 'time-only' ? 'duration' : exercise?.metricMode === 'reps-only' ? 'reps' : exercise?.category === 'cardio' ? 'distance' : 'load')
  const { points, excluded } = exerciseSeries(workouts, selectedId, currentMetric, data.profile.loadUnit, exercise?.analysis?.loadConvention)
  const max = Math.max(1, ...points.slice(-16).map(point => point.value))
  const unit = currentMetric === 'load' ? data.profile.loadUnit : currentMetric === 'distance' ? 'km' : currentMetric === 'reps' ? 'reps' : currentMetric === 'pace' ? 'min/km' : 'min'
  const days = periodDays(period, new Date(`${today}T12:00:00`))
  const counts = new Map<string, number>()
  for (const workout of workouts) { const key = dayKey(workout.startedAt, workout.timeZone); counts.set(key, (counts.get(key) ?? 0) + 1) }
  const weeks = Array.from({ length: Math.ceil(period / 7) }, (_, index) => {
    const dates = days.slice(index * 7, index * 7 + 7)
    return { first: dates[0], last: dates.at(-1)!, count: dates.reduce((total, date) => total + (counts.get(date) ?? 0), 0) }
  })
  const weeklyMax = Math.max(1, ...weeks.map(week => week.count))
  const selectedRow = regions.rows.find(row => row.id === selectedRegion)
  const regionMax = Math.max(1, ...regions.rows.map(row => row.direct + (includeSupport ? row.supporting : 0)))
  const shortDay = (date: string) => dateLabel(`${date}T12:00:00`)
  return <div className="evolution-journal">
    <div className="evolution-period" role="group" aria-label="Período da evolução">{[28, 90, 365].map(days => <button key={days} aria-pressed={period === days} onClick={() => setPeriod(days)}>{days === 28 ? '4 semanas' : days === 90 ? '90 dias' : '1 ano'}</button>)}</div>
    <p className="evolution-range">{shortDay(days[0])} — {shortDay(days.at(-1)!)}</p>
    <section className="evolution-rhythm" aria-labelledby="rhythm-heading">
      <p className="eyebrow">Sua história, em movimento</p><h2 id="rhythm-heading">Cada registro conta.</h2>
      <p className="evolution-lead">{summary.sessions ? <><strong>{summary.sessions}</strong> {summary.sessions === 1 ? 'treino guardado' : 'treinos guardados'} em {summary.days} {summary.days === 1 ? 'dia' : 'dias'}.</> : 'Seu próximo treino abre esta página da história.'}</p>
      <p className="muted">{summary.sessions ? 'Sem sequência obrigatória. Aqui cabe o ritmo da sua vida.' : 'Finalize um treino com registros concluídos para ver seu ritmo, os movimentos e as mudanças por aqui.'}</p>
      <div className="evolution-totals"><div><strong>{summary.sets}</strong><span>Séries de força</span></div><div><strong>{summary.activityRecords}</strong><span>Registros de atividades</span></div><div><strong>{number(summary.elapsedMinutes)} <small>min</small></strong><span>Duração das sessões</span></div></div>
      {summary.sessions > 0 && <small className="evolution-footnote">Inclui {timeLabel(summary.restSeconds)} de descansos registrados. Duração da sessão não é tempo de exercício ativo.</small>}
      {summary.sessions === 0 ? <NavLink className="quiet-action" to="/">Ir para Início <ArrowUpRight size={17} /></NavLink> : <>
        <div className="rhythm-bars" role="img" aria-label={`Treinos por bloco de até sete dias: ${weeks.map(week => `${shortDay(week.first)} a ${shortDay(week.last)}: ${week.count}`).join('; ')}`}>{weeks.map(week => <div key={week.first} title={`${shortDay(week.first)} — ${shortDay(week.last)}: ${week.count} treinos`}><i style={{ height: `${Math.max(3, week.count / weeklyMax * 100)}%` }} className={week.count ? 'recorded' : ''} /><span>{weeks.length <= 13 ? week.count : ''}</span></div>)}</div>
        <div className="chart-axis"><span>{shortDay(days[0])}</span><small>Treinos por bloco de 7 dias</small><span>{shortDay(days.at(-1)!)}</span></div>
        <details className="evolution-details"><summary>Ver os dias registrados <ChevronDown size={17} /></summary><div className="recorded-days">{[...counts].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => <div key={date}><strong>{shortDay(date)}</strong><span>{count} {count === 1 ? 'treino' : 'treinos'}</span></div>)}</div></details>
      </>}
    </section>

    {used.length > 0 && <section className="evolution-section" aria-labelledby="movement-progress-title">
      <p className="eyebrow">De um treino para outro</p><h2 id="movement-progress-title">Olhe um movimento.</h2>
      <label className="field"><span>Exercício ou atividade</span><select value={selectedId} onChange={event => { setSelected(event.target.value); const target = exercises.find(row => row.id === event.target.value); setMetric(target?.metricMode === 'time-only' ? 'duration' : target?.metricMode === 'reps-only' ? 'reps' : target?.category === 'cardio' ? 'distance' : 'load') }}>{used.map(id => <option key={id} value={id}>{exercises.find(row => row.id === id)?.name ?? workouts.flatMap(workout => workout.items).find(item => item.exerciseId === id)?.exerciseName ?? 'Exercício pessoal'}</option>)}</select></label>
      <div className="evolution-metrics" role="group" aria-label="Medida no gráfico">{available.map(value => <button key={value} aria-pressed={currentMetric === value} onClick={() => setMetric(value)}>{value === 'load' && exercise?.analysis?.loadConvention === 'assistance' ? 'Assistência' : metricLabels[value]}</button>)}</div>
      <p className="evolution-measure-note">{currentMetric === 'load' ? `${exercise?.analysis ? loadConventionLabels[exercise.analysis.loadConvention] : 'Carga'} · ${exercise?.analysis?.loadConvention === 'assistance' ? 'Menor assistência registrada por sessão. Menor valor significa menos ajuda.' : 'Maior valor registrado por sessão; confira as repetições junto da carga.'}` : currentMetric === 'reps' ? 'Maior número de repetições em uma série; cargas diferentes podem mudar a comparação.' : currentMetric === 'pace' ? 'Tempo ÷ distância dos blocos que têm as duas medidas. Menor valor = ritmo mais rápido; terreno e condições importam.' : 'Soma dos blocos concluídos desta atividade na sessão; não inclui o cronômetro geral do treino.'}</p>
      {points.length ? <>
        <div className="evolution-progress-stat"><strong>{number(points.at(-1)!.value)} <small>{unit}</small></strong><span>No registro mais recente<br />{points.at(-1)!.description}</span></div>
        <svg className="evolution-chart" viewBox="0 0 640 180" role="img" aria-label={`${metricLabels[currentMetric]} de ${exercise?.name ?? itemName}: ${points.slice(-16).map(point => `${shortDay(point.localDay)}, ${number(point.value)} ${unit}`).join('; ')}`}>
          {[0, 1, 2].map(index => <line key={index} x1="12" x2="628" y1={20 + index * 70} y2={20 + index * 70} className="chart-rule" />)}
          {points.slice(-16).map((point, index, array) => { const slot = 600 / array.length; const h = point.value / max * 135; return <rect key={point.workoutId} x={20 + index * slot + slot * .2} y={160 - h} width={slot * .6} height={Math.max(2, h)} rx="5"><title>{shortDay(point.localDay)}: {number(point.value)} {unit}</title></rect> })}
        </svg>
        <div className="chart-axis"><span>{shortDay(points.slice(-16)[0].localDay)}</span><small>{points.length > 16 ? 'Últimas 16 sessões do período' : `${points.length} ${points.length === 1 ? 'sessão com esta medida' : 'sessões com esta medida'}`}</small><span>{shortDay(points.at(-1)!.localDay)}</span></div>
        {points.length < 2 && <p className="muted">Primeiro ponto guardado. O próximo registro já permite olhar os dois lado a lado.</p>}
        <details className="evolution-details"><summary>Ver valores e abrir os treinos <ChevronDown size={17} /></summary><ul className="evolution-source-list">{[...points].reverse().map(point => <li key={point.workoutId}><NavLink to={`/treino/${point.workoutId}`}><span><strong>{shortDay(point.localDay)} · {number(point.value)} {unit}</strong><small>{point.description}</small><small>{point.title}</small></span><ArrowUpRight size={18} /></NavLink></li>)}</ul></details>
      </> : <p className="evolution-empty">Ainda não há registros comparáveis desta medida no período. Você pode escolher outra medida ou consultar o treino original.</p>}
      {excluded > 0 && <p className="evolution-footnote">{excluded} {excluded === 1 ? 'registro ficou' : 'registros ficaram'} fora deste gráfico por faltar unidade ou uma convenção de carga compatível. Nada foi apagado do histórico.</p>}
    </section>}

    {summary.sets > 0 && <section className="evolution-section" aria-labelledby="body-distribution-title">
      <p className="eyebrow">Onde você dedicou séries</p><h2 id="body-distribution-title">Seu mapa de movimentos.</h2>
      <p className="muted">Séries por região, não crescimento muscular nem recuperação. Uma série pode envolver várias regiões.</p>
      <label className="evolution-support-toggle"><input type="checkbox" checked={includeSupport} onChange={event => setIncludeSupport(event.target.checked)} /> Incluir participação secundária</label>
      <div className="evolution-body-layout"><div className="muscle-views">{(['front', 'back'] as const).map(view => <figure key={view}><svg viewBox="0 0 180 402" aria-hidden="true"><path className="muscle-body" d={bodyOutline} />{(view === 'front' ? frontPatches : backPatches).map((patch, index) => {
        const row = regions.rows.find(row => row.id === patch.region)!
        const count = row.direct + (includeSupport ? row.supporting : 0)
        return <g key={index} className={`evolution-body-region${selectedRegion === patch.region ? ' selected' : ''}`} style={{ fill: count ? `rgba(244, 91, 154, ${.28 + .72 * count / regionMax})` : 'var(--evolution-neutral, #e4ddd0)' }} onClick={() => setSelectedRegion(patch.region)}><path d={patch.path} />{patch.mirrored && <path d={patch.path} transform="translate(180 0) scale(-1 1)" />}</g>
      })}</svg><figcaption>{view === 'front' ? 'Frente' : 'Costas'}</figcaption></figure>)}</div>
      <div className="evolution-regions" role="group" aria-label="Séries por região">{regions.rows.filter(row => row.direct + row.supporting > 0).sort((a, b) => b.direct + (includeSupport ? b.supporting : 0) - a.direct - (includeSupport ? a.supporting : 0)).map(row => <button key={row.id} aria-pressed={selectedRegion === row.id} onClick={() => setSelectedRegion(row.id)}><span>{row.label}</span><strong>{row.direct + (includeSupport ? row.supporting : 0)}</strong></button>)}</div></div>
      {selectedRow && <div className="evolution-region-detail" role="status"><strong>{selectedRow.label}</strong><p>{selectedRow.direct} séries como alvo principal · {selectedRow.supporting} como participação secundária.</p><div>{[...selectedRow.exerciseIds].map(id => <NavLink key={id} to={`/exercicios/${id}`}>{exercises.find(exercise => exercise.id === id)?.name ?? 'Exercício pessoal'} <ArrowUpRight size={14} /></NavLink>)}</div></div>}
      <p className="evolution-footnote">Não somamos cardio ou práticas amplas como Pilates ao mapa de séries de força.{regions.legacySets > 0 && ` ${regions.legacySets} séries antigas usam a classificação atual do catálogo, pois não tinham uma classificação salva.`}{regions.unmappedSets > 0 && ` ${regions.unmappedSets} séries não têm mapeamento e continuam no total de força.`}</p>
    </section>}

    {summary.sessions > 0 && <section className="evolution-section" aria-labelledby="felt-title"><p className="eyebrow">Além dos números</p><h2 id="felt-title">Como foi para você?</h2><p className="muted">A intensidade que você marcou ao guardar. É sua percepção da sessão, não uma medição fisiológica.</p><div className="evolution-feelings">{([{ key: 'leve', label: 'Leve' }, { key: 'normal', label: 'Normal' }, { key: 'intenso', label: 'Intenso' }] as const).map(({ key, label }) => <div key={key}><strong>{summary.feelings[key]}</strong><span>{label}</span></div>)}</div>{summary.feelings.unmarked > 0 && <small>{summary.feelings.unmarked} sessões sem intensidade marcada.</small>}</section>}
    <details className="evolution-details evolution-method"><summary><span><Info size={17} /> Como lemos seus registros</span><ChevronDown size={17} /></summary><p>Entram treinos guardados e linhas marcadas como feitas, com valores válidos nas medidas escolhidas. Rascunhos não viram resultado. Séries de força e blocos de outras atividades ficam separados.</p><p>O período usa a data de início da sessão, no fuso salvo quando disponível; registros antigos usam o fuso deste aparelho. A classificação é guardada nos novos exercícios do treino para preservar o significado do histórico.</p><p>Carga não é sinônimo de progresso sozinha. Técnica, amplitude, máquina, repetições e condições do dia influenciam a comparação. Não estimamos calorias, recuperação, risco de lesão nem crescimento muscular.</p><p>Os cálculos acontecem neste aparelho, sem enviar seus registros para uma API de análise.</p></details>
  </div>
}
