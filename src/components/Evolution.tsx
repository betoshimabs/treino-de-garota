import { useMemo, useState } from 'react'
import { ArrowUpRight, ChevronDown, Info, Trophy } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import type { AppSnapshot, Exercise, WorkoutMetric } from '../types'
import { dayKey, effortCalendar, evolutionPeriods, executionRanking, exerciseSeries, metricHighlights, muscleShares, periodWindow, recordedMetrics, weeklyFrequency, workoutsInDays, type EvolutionPeriod } from '../evolution'
import { macroGroups } from '../muscle-taxonomy'
import { bodyOutline, frontPatches, backPatches } from './muscle-geometry'
import { EffortCalendar, EvolutionDialog, EvolutionLine, numeric, Shares, shortDate } from './EvolutionVisuals'
import '../evolution.css'

const labels: Record<WorkoutMetric, string> = { load: 'Carga', reps: 'Repetições', distance: 'Distância', duration: 'Tempo' }
const searchable = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
export function Evolution({ data, exercises, now = new Date() }: { data: AppSnapshot; exercises: Exercise[]; now?: Date }) {
  const [period, setPeriod] = useState<EvolutionPeriod>('4w')
  const [selected, setSelected] = useState(''); const [metric, setMetric] = useState<WorkoutMetric>('load')
  const [modal, setModal] = useState<'exercise' | 'groups' | 'info' | null>(null)
  const [query, setQuery] = useState(''); const [includeSupport, setIncludeSupport] = useState(false)
  const [macro, setMacro] = useState<string>(); const [group, setGroup] = useState<string>()
  const today = dayKey(now)
  const window = useMemo(() => periodWindow(period, new Date(today + 'T12:00:00')), [period, today])
  const workouts = useMemo(() => workoutsInDays(data.workouts, window.days), [data.workouts, window])
  const previous = useMemo(() => workoutsInDays(data.workouts, window.previousDays), [data.workouts, window])
  const history = useMemo(() => data.workouts.filter(w => dayKey(w.startedAt, w.timeZone) <= today), [data.workouts, today])
  const highlights = useMemo(() => metricHighlights(workouts, history, data.profile.loadUnit), [workouts, history, data.profile.loadUnit])
  const ranking = useMemo(() => executionRanking(workouts, exercises), [workouts, exercises])
  const shares = useMemo(() => muscleShares(workouts, exercises, includeSupport), [workouts, exercises, includeSupport])
  const calendar = useMemo(() => effortCalendar(workouts, window.days), [workouts, window])
  const current = ranking.find(row => row.id === selected) ?? ranking[0]
  const exercise = exercises.find(row => row.id === current?.id)
  const convention = exercise?.analysis?.loadConvention ?? workouts.flatMap(w => w.items).find(i => i.exerciseId === current?.id && i.analysis)?.analysis?.loadConvention
  const series = recordedMetrics.map(m => ({ metric: m, ...exerciseSeries(workouts, current?.id ?? '', m, data.profile.loadUnit, convention) }))
  const available = series.filter(s => s.points.length > 0)
  const progress = available.find(s => s.metric === metric) ?? available[0]
  const unitOf = (m: WorkoutMetric) => m === 'load' ? data.profile.loadUnit : m === 'reps' ? 'reps' : m === 'distance' ? 'km' : 'min'
  const percentage = previous.length ? (workouts.length - previous.length) / previous.length * 100 : undefined
  const maxShare = Math.max(1, ...shares.groups.map(r => r.count))
  const selectedMacro = macroGroups.find(row => row.id === macro)
  const options = ranking.filter(row => searchable(row.name).includes(searchable(query)))
  const close = () => setModal(null)
  return <div className="evolution-journal">
    <div className="evolution-period" role="group" aria-label="Período da evolução">{evolutionPeriods.map(p => <button key={p.id} aria-pressed={period === p.id} onClick={() => setPeriod(p.id)}>{p.label}</button>)}</div>
    <div className="evolution-range-row"><p className="evolution-range">{shortDate(window.days[0])}{window.days[0].slice(0, 4) !== today.slice(0, 4) ? ' ' + window.days[0].slice(0, 4) : ''} — {shortDate(window.days.at(-1)!)} · {today.slice(0, 4)}</p><button className="icon-button" aria-label="Como calculamos sua evolução" onClick={() => setModal('info')}><Info size={19} /></button></div>
    <section className="evolution-rhythm" aria-label="Treinos no período">
      <h2 className="evolution-count"><strong>{workouts.length}</strong> {workouts.length === 1 ? 'treino' : 'treinos'} <small>no período</small></h2>
      <p className="evolution-comparison">{percentage === undefined ? 'Sem treinos no período anterior' : percentage === 0 ? 'Mesmo total do período anterior' : numeric(Math.abs(percentage)) + '% ' + (percentage > 0 ? 'mais' : 'menos') + ' que no período anterior'}</p>
      {!workouts.length && <NavLink className="quiet-action" to="/">Começar um treino <ArrowUpRight size={16} /></NavLink>}
      <div className="metric-summary"><h3>Máximos registrados</h3><div className="metric-grid">{highlights.map(row => <div key={row.metric}>
        <span>{labels[row.metric]}</span><strong>{row.maximum ? numeric(row.maximum.value) : '—'} <small>{unitOf(row.metric)}</small></strong>
        {row.maximum ? <><NavLink to={'/treino/' + row.maximum.workoutId} className="metric-origin">{row.maximum.name}<br />{shortDate(row.maximum.day)}</NavLink>{row.personalRecord && <small className="personal-record"><Trophy size={12} /> Recorde pessoal</small>}</> : <small>Sem registro</small>}
      </div>)}</div></div>
      <div className="metric-summary"><h3>Médias por registro</h3><div className="metric-grid">{highlights.map(row => <div key={row.metric}><span>{labels[row.metric]}</span><strong>{row.average === undefined ? '—' : numeric(row.average)} <small>{unitOf(row.metric)}</small></strong><small>{row.count} {row.count === 1 ? 'registro' : 'registros'}</small></div>)}</div></div>
      <h3 className="chart-heading">Seu ritmo de treinos</h3><p className="evolution-footnote">Treinos por bloco de até 7 dias</p>
      <EvolutionLine title="Frequência de treinos" unit="treinos" points={weeklyFrequency(workouts, window.days).map(w => ({ ...w, label: shortDate(w.date) + ' — ' + shortDate(w.end) }))} />
    </section>

    <section className="evolution-section" aria-labelledby="movement-progress-title"><h2 id="movement-progress-title">Olhe um movimento.</h2>
      {current ? <><button className="exercise-picker" onClick={() => { setQuery(''); setModal('exercise') }} aria-haspopup="dialog"><span><strong>{current.name}</strong><small>{current.count} {current.count === 1 ? 'execução' : 'execuções'} no período</small></span><ChevronDown size={19} /></button>
        <div className="evolution-metrics" role="group" aria-label="Medida no gráfico">{available.map(s => <button key={s.metric} aria-pressed={progress?.metric === s.metric} onClick={() => setMetric(s.metric)}>{s.metric === 'load' && convention === 'assistance' ? 'Assistência' : labels[s.metric]}</button>)}</div>
        {progress ? <><p className="evolution-footnote">{progress.metric === 'load' ? convention === 'assistance' ? 'Menor assistência por sessão · Menos peso = menos ajuda' : 'Maior carga por sessão' : progress.metric === 'reps' ? 'Maior número de repetições em uma série por sessão' : 'Soma dos registros por sessão'}</p>
          <EvolutionLine title={labels[progress.metric] + ' · ' + current.name} unit={unitOf(progress.metric)} points={progress.points.map(p => ({ date: p.date, value: p.value, label: shortDate(p.localDay) }))} />
          <details className="evolution-details"><summary>Ver valores <ChevronDown size={17} /></summary><ul className="evolution-source-list">{[...progress.points].reverse().map(p => <li key={p.workoutId}><NavLink to={'/treino/' + p.workoutId}><span><strong>{shortDate(p.localDay)} · {numeric(p.value)} {unitOf(progress.metric)}</strong><small>{p.description}</small></span><ArrowUpRight size={17} /></NavLink></li>)}</ul></details>
        </> : <p className="evolution-empty">Os registros precisam de unidade e convenção de carga para entrar no gráfico.</p>}
        {series.some(s => s.excluded > 0) && <p className="evolution-footnote">Há cargas sem unidade ou convenção compatível. Elas continuam no histórico, fora da comparação.</p>}
      </> : <p className="evolution-empty">Seus exercícios aparecem aqui ao guardar um treino.</p>}
    </section>

    <section className="evolution-section" aria-labelledby="body-distribution-title"><h2 id="body-distribution-title">Seu mapa de movimentos.</h2><p className="evolution-footnote">Participação nos registros de força · Não mede esforço muscular</p>
      <label className="evolution-support-toggle"><input type="checkbox" checked={includeSupport} onChange={e => setIncludeSupport(e.target.checked)} /> Incluir “Também trabalha”</label>
      <div className="evolution-body-layout"><div className="muscle-views">{(['front', 'back'] as const).map(view => <figure key={view}><svg viewBox="0 0 180 402" aria-hidden="true"><path className="muscle-body" d={bodyOutline} />{(view === 'front' ? frontPatches : backPatches).map((patch, i) => {
        const row = shares.groups.find(r => r.id === patch.region)!
        const highlighted = selectedMacro?.groups.some(id => id === patch.region)
        return <g key={i} className={'evolution-body-region' + (highlighted ? ' selected' : '')} style={{ fill: row.count ? 'rgba(244,91,154,' + (.25 + .75 * row.count / maxShare) + ')' : '#e4ddd0', opacity: selectedMacro && !highlighted ? .35 : 1 }} onClick={() => setMacro(macroGroups.find(m => m.groups.some(id => id === patch.region))?.id)}><path d={patch.path} />{patch.mirrored && <path d={patch.path} transform="translate(180 0) scale(-1 1)" />}</g>
      })}</svg><figcaption>{view === 'front' ? 'Frente' : 'Costas'}</figcaption></figure>)}</div><Shares rows={shares.macros} selected={macro} select={id => setMacro(macro === id ? undefined : id)} label="Macrogrupos" /></div>
      {!shares.total && <p className="evolution-empty">Ainda não há séries com grupos musculares identificados neste período.</p>}
      <button className="quiet-action" onClick={() => setModal('groups')}>Detalhar grupos musculares <ArrowUpRight size={17} /></button>
    </section>
    <section className="evolution-section" aria-labelledby="felt-title"><h2 id="felt-title">Como foi para você?</h2><p className="evolution-footnote">Sua intensidade percebida no período</p><EffortCalendar key={period} days={calendar} period={period} /></section>

    {modal === 'exercise' && <EvolutionDialog title="Qual movimento?" close={close}><label className="field"><span>Buscar exercício ou atividade</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Nome do movimento" /></label><div className="exercise-options">{options.map(row => <button key={row.id} aria-pressed={row.id === current?.id} onClick={() => { setSelected(row.id); setMetric('load'); close() }}><strong>{row.name}</strong><small>{row.count} {row.count === 1 ? 'execução' : 'execuções'}</small></button>)}{!options.length && <p>Nenhum movimento encontrado.</p>}</div><p className="evolution-footnote">Uma execução = presença em um treino, com ao menos um registro concluído. Mais executados primeiro.</p></EvolutionDialog>}
    {modal === 'groups' && <EvolutionDialog title="Grupos musculares" close={close}><p className="evolution-footnote">Percentual entre todos os grupos · {includeSupport ? 'Principais e secundários' : 'Alvos principais'}</p><Shares rows={shares.groups} selected={group} select={id => setGroup(group === id ? undefined : id)} label="Grupos musculares" />{group && <div className="evolution-group-context">{shares.groups.filter(r => r.id === group).map(r => <div key={r.id}><strong>{r.label}</strong><p>{r.direct} séries como principal · {r.supporting} como secundário</p>{[...r.exerciseIds].map(id => <NavLink key={id} to={'/exercicios/' + id} onClick={close}>{exercises.find(e => e.id === id)?.name ?? 'Exercício pessoal'}</NavLink>)}</div>)}</div>}</EvolutionDialog>}
    {modal === 'info' && <EvolutionDialog title="Por trás dos números" close={close}><div className="evolution-method">
      <h3>Período e comparação</h3><p>Treinos guardados com registros concluídos e válidos, pela data de início no fuso salvo. Comparamos com os {window.days.length} dias imediatamente anteriores. Se o total anterior for zero, não calculamos porcentagem.</p>
      <h3>Máximos, médias e recordes</h3><p>Cada série ou bloco concluído é um registro. Máximos e médias usam os valores registrados, não volume de carga nem o cronômetro geral. A média reúne exercícios diferentes: é descritiva, não uma avaliação de desempenho.</p><p>Recorde pessoal identifica o primeiro maior registro daquele exercício e medida em todo o histórico até hoje. Empates mantêm a primeira ocorrência. Cargas só entram com unidade e convenção conhecidas; assistência fica fora dos máximos e médias de carga. Máquinas diferentes ainda podem não ser comparáveis.</p><p>Os recordes são recalculados a partir das séries salvas. Corrigir ou excluir um registro atualiza os destaques. Gráficos também marcam o primeiro máximo e mínimo em caso de empate.</p>
      <h3>Mapa de movimentos</h3><p>Cada série conta uma participação por grupo principal. O switch inclui também os secundários, sem duplicar o mesmo grupo. Dividimos pelo total de participações; macrogrupos somam seus grupos. Não são percentuais de ativação, crescimento, recuperação ou equilíbrio ideal.</p><p>Abdutores é uma categoria funcional que inclui glúteos médio/mínimo; o desenho indica a lateral do quadril. Costas reúne dorsais e parte alta; Abdômen inclui oblíquos. São regiões simplificadas, não um atlas anatômico.</p><p>Cardio e práticas amplas não são convertidos em séries de força. {shares.legacySets} séries antigas usam o catálogo atual por não terem classificação salva; {shares.unmappedSets} séries não têm mapeamento. Nada é apagado.</p>
      <h3>Calendário</h3><p>Leve = 1, Normal = 2, Intenso = 3. Cada célula reúne 1 dia, 3 dias, 1 semana ou 2 semanas conforme o período. Usamos a média de todas as intensidades informadas no intervalo e arredondamos para a cor mais próxima (empate para cima). Intervalos com treinos, mas nenhuma intensidade informada, têm um ponto, não uma intensidade inventada. Isso é percepção, não medição fisiológica.</p><p>Todos os cálculos ficam neste aparelho. Nenhum dado é enviado a uma API de análise.</p>
    </div></EvolutionDialog>}
  </div>
}
