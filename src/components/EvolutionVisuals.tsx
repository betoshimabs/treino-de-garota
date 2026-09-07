import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { effortCalendar, effortCells, extrema, type EvolutionPeriod } from '../evolution'

export const numeric = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
export const shortDate = (day: string) => new Date(`${day.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
export function EvolutionDialog({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null); const id = useId()
  useEffect(() => {
    const dialog = ref.current!; const trigger = document.activeElement as HTMLElement | null
    dialog.showModal()
    return () => { dialog.close(); queueMicrotask(() => { if (!dialog.isConnected && trigger?.isConnected) trigger.focus() }) }
  }, [])
  return <dialog ref={ref} className="guide-dialog evolution-dialog" aria-labelledby={id} onCancel={close} onClose={() => { if (!ref.current?.open) close() }}>
    <header><div><small className="guide-eyebrow">Sua evolução</small><h2 id={id}>{title}</h2></div><button className="icon-button" aria-label="Fechar" onClick={close}><X /></button></header>
    <div className="evolution-dialog-content">{children}</div>
  </dialog>
}
export interface LinePoint { date: string; value: number; label?: string }
export function EvolutionLine({ points, unit, title }: { points: LinePoint[]; unit: string; title: string }) {
  const extremes = extrema(points)
  if (!extremes) return <p className="evolution-empty">Sem registros desta medida no período.</p>
  const top = Math.max(1, points[extremes.max].value)
  const times = points.map(p => Date.parse(p.date.length === 10 ? `${p.date}T12:00:00` : p.date))
  const span = times.at(-1)! - times[0]
  const x = (i: number) => span ? 38 + (times[i] - times[0]) / span * 298 : points.length > 1 ? 38 + i / (points.length - 1) * 298 : 187
  const y = (v: number) => 140 - v / top * 112
  const same = extremes.min === extremes.max
  return <div className="evolution-line"><svg viewBox="0 0 360 168" role="img" aria-label={`${title}. ${points.map(p => `${p.label ?? shortDate(p.date)}: ${numeric(p.value)} ${unit}`).join('; ')}`}>
    {[0, .5, 1].map(f => <g key={f}><line x1="38" x2="340" y1={y(top * f)} y2={y(top * f)} className="chart-rule" /><text x="30" y={y(top * f) + 4} textAnchor="end">{top * f >= 10000 ? (top * f).toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }) : numeric(top * f)}</text></g>)}
    <polyline points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')} fill="none" stroke="#9b365b" strokeWidth="2.5" strokeLinejoin="round" />
    {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.value)} r="2.5" fill="#9b365b"><title>{p.label ?? shortDate(p.date)}: {numeric(p.value)} {unit}</title></circle>)}
    {[...new Set([extremes.max, extremes.min])].map(i => <g key={i} className={i === extremes.min && !same ? 'line-minimum' : undefined}><circle cx={x(i)} cy={y(points[i].value)} r={i === extremes.min && !same ? 3 : 5} fill="#fffdf8" stroke="#171512" strokeWidth="1.5" /><text x={x(i)} y={y(points[i].value) + (i === extremes.max ? -11 : 18)} textAnchor="middle" className="extreme-marker">{same ? 'Máx/mín' : i === extremes.max ? 'Máx' : 'Mín'}</text></g>)}
  </svg><div className="chart-axis"><span>{points[0].label?.split(' — ')[0] ?? shortDate(points[0].date)}</span><span>{unit}</span><span>{points.at(-1)!.label?.split(' — ').at(-1) ?? shortDate(points.at(-1)!.date)}</span></div>
  <div className="line-extremes">{(same ? [['Máx / mín', extremes.max]] : [['Máximo', extremes.max], ['Mínimo', extremes.min]]).map(([label, index]) => { const point = points[index as number]; return <div key={label} className={label === 'Mínimo' ? 'line-minimum-summary' : undefined}><span>{label}</span><strong>{numeric(point.value)} <small>{unit}</small></strong><small>{point.label ?? shortDate(point.date)}</small></div> })}</div></div>
}
export interface ShareRow { id: string; label: string; percent: number; count: number }
export function Shares({ rows, selected, select, label }: { rows: ShareRow[]; selected?: string; select?: (id: string) => void; label: string }) {
  const [view, setView] = useState<'list' | 'radar'>('list')
  const coordinate = (i: number, amount: number) => { const a = -Math.PI / 2 + i / rows.length * Math.PI * 2; return [160 + Math.cos(a) * amount, 146 + Math.sin(a) * amount] }
  return <div className="evolution-shares"><div className="share-switch" role="group" aria-label={`Visualização de ${label}`}><button aria-pressed={view === 'list'} onClick={() => setView('list')}>Lista</button><button aria-pressed={view === 'radar'} onClick={() => setView('radar')}>Teia</button></div>
    {view === 'radar' && <><svg className="evolution-radar" viewBox="0 0 320 292" role="img" aria-label={`${label}, escala de 0 a 100%. ${rows.map(r => `${r.label}: ${numeric(r.percent)}%`).join('; ')}`}>
      {[25, 50, 75, 100].map(p => <polygon key={p} points={rows.map((_, i) => coordinate(i, p).join(',')).join(' ')} fill="none" className="chart-rule" />)}
      {rows.map((r, i) => { const [x, y] = coordinate(i, 100); const [tx, ty] = coordinate(i, 121); return <g key={r.id}><line x1="160" y1="146" x2={x} y2={y} className="chart-rule" /><text x={tx} y={ty + 4} textAnchor="middle">{rows.length > 7 ? i + 1 : r.label}</text></g> })}
      <polygon points={rows.map((r, i) => coordinate(i, r.percent).join(',')).join(' ')} fill="#f3b6cf" fillOpacity=".6" stroke="#9b365b" strokeWidth="2" />
      {rows.map((r, i) => { const [cx, cy] = coordinate(i, r.percent); return <circle key={r.id} cx={cx} cy={cy} r="3" fill="#9b365b" /> })}
    </svg><p className="evolution-footnote">Centro: 0% · Borda: 100%</p></>}
    <div className={`share-list ${view === 'radar' ? 'radar-legend' : ''}`} aria-label={label}>{rows.map((r, i) => {
      const content = <><span>{view === 'radar' && rows.length > 7 ? `${i + 1}. ` : ''}{r.label}</span><strong>{numeric(r.percent)}%</strong>{view === 'list' && <i aria-hidden="true"><b style={{ width: `${r.percent}%` }} /></i>}</>
      return select ? <button key={r.id} aria-pressed={selected === r.id} onClick={() => select(r.id)}>{content}</button> : <div key={r.id}>{content}</div>
    })}</div>
  </div>
}
type EffortDay = ReturnType<typeof effortCalendar>[number]
const feelings = ['Sem intensidade', 'Leve', 'Normal', 'Intenso']
export function EffortCalendar({ days, period }: { days: EffortDay[]; period: EvolutionPeriod }) {
  const cells = effortCells(days, period)
  const [selected, setSelected] = useState(cells.at(-1)?.date)
  const active = cells.find(d => d.date === selected) ?? cells.at(-1)!
  const container = useRef<HTMLDivElement>(null)
  const range = (d: typeof active) => d.date === d.end ? shortDate(d.date) : shortDate(d.date) + ' — ' + shortDate(d.end)
  const describe = (d: typeof active) => range(d) + ': ' + d.sessions + (d.sessions === 1 ? ' treino; ' : ' treinos; ') + (d.marked ? feelings[d.level] + ', média ' + numeric(d.average!) + ' de 3 (' + d.marked + ' com intensidade)' : d.sessions ? 'intensidade não informada' : 'sem registro')
  return <div className="effort-calendar">
    <div className="effort-selection-card" role="status" aria-atomic="true">
      <strong>{range(active)}</strong>
      <span>{active.sessions} {active.sessions === 1 ? 'treino' : 'treinos'} · {active.marked ? feelings[active.level] : active.sessions ? 'Intensidade não informada' : 'Sem registro'}</span>
    </div>
    <div className="effort-matrix" ref={container} role="group" aria-label="Intensidade em ordem cronológica, da esquerda para a direita e de cima para baixo. Use as setas para navegar.">
      {Array.from({ length: Math.ceil(cells.length / 7) }, (_, row) => {
        const slice = cells.slice(row * 7, row * 7 + 7)
        return <div className="effort-matrix-row" key={row}>
          <div className="effort-row-cells">{slice.map((d, column) => <button key={d.date} data-day={d.date} className={'effort-' + d.level} aria-label={describe(d)} aria-pressed={active.date === d.date} tabIndex={active.date === d.date ? 0 : -1} title={describe(d)} onClick={() => setSelected(d.date)} onKeyDown={e => {
            const index = row * 7 + column
            const delta = { ArrowUp: -7, ArrowDown: 7, ArrowLeft: -1, ArrowRight: 1, Home: -index, End: cells.length - 1 - index }[e.key]
            if (delta === undefined) return
            e.preventDefault()
            const next = cells[Math.max(0, Math.min(cells.length - 1, index + delta))]
            setSelected(next.date); container.current?.querySelector<HTMLButtonElement>('[data-day="' + next.date + '"]')?.focus()
          }}>{!d.marked && d.sessions ? '·' : ''}</button>)}</div>
        </div>
      })}
    </div>
    <div className="effort-legend">{['Sem registro', 'Leve', 'Normal', 'Intenso'].map((l, i) => <span key={l}><i className={'effort-' + i} />{l}</span>)}</div>
    <small className="evolution-footnote">Leia da esquerda para a direita, linha a linha. Toque em uma célula para ver seu intervalo.{cells.at(-1)!.days < ({ '4w': 1, '12w': 3, '6m': 7, '12m': 14 }[period]) ? ' A última reúne apenas os dias restantes.' : ''}</small>
  </div>
}
