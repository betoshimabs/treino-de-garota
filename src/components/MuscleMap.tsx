import { useRef, useState } from 'react'
import { Expand, X } from 'lucide-react'
import { muscleMapping, regionRole } from '../muscle-map'
import type { ExerciseCuration } from '../types'
import { bodyOutline, frontPatches, backPatches } from './muscle-geometry'

export function MuscleMap({ curation }: { curation: ExerciseCuration }) {
  const [selected, setSelected] = useState<string>()
  const dialog = useRef<HTMLDialogElement>(null)
  const all = [...new Set([...curation.primaryMuscles, ...curation.secondaryMuscles])]
  const mapping = selected ? muscleMapping(selected) : undefined
  const choose = (name: string) => setSelected(value => value === name ? undefined : name)
  const drawing = (view: 'front' | 'back') => <figure key={view}><svg viewBox="0 0 180 402" aria-hidden="true">
    <path className="muscle-body" d={bodyOutline} />
    {(view === 'front' ? frontPatches : backPatches).map((patch, index) => {
      const role = regionRole(patch.region, curation.primaryMuscles, curation.secondaryMuscles)
      const highlighted = mapping?.regions.includes(patch.region)
      const names = all.filter(name => muscleMapping(name)?.regions.includes(patch.region))
      return <g key={index} className={`muscle-region ${role}${highlighted ? ' selected' : ''}${selected && !highlighted ? ' muted' : ''}`} onClick={names.length ? () => choose(names.find(name => curation.primaryMuscles.includes(name)) ?? names[0]) : undefined}>
        <path d={patch.path} />{patch.mirrored && <path d={patch.path} transform="translate(180 0) scale(-1 1)" />}
      </g>
    })}
  </svg><figcaption>{view === 'front' ? 'Frente' : 'Costas'}</figcaption></figure>
  const labels = () => <div className="muscle-labels">{[{ title: 'Alvo principal', names: curation.primaryMuscles, role: 'primary' }, { title: 'Também trabalha', names: curation.secondaryMuscles, role: 'secondary' }].map(group => <div key={group.role}><h3><i className={group.role} />{group.title}</h3><div>{group.names.length ? group.names.map(name => <button type="button" key={name} aria-pressed={selected === name} onClick={() => choose(name)}>{name}</button>) : <small>Não informado no catálogo</small>}</div></div>)}</div>
  const message = selected ? `${selected} · ${mapping?.nonMuscular ? 'É uma capacidade ou sistema, não um músculo isolado.' : !mapping ? 'Sem região correspondente neste mapa.' : mapping.approximate ? 'Localização aproximada por região; não mostra músculos profundos separadamente.' : 'Região destacada no mapa.'}` : 'Toque em um nome para localizar a região.'
  return <section className="muscle-map" aria-label="Onde trabalha">
    <div className="section-heading"><div><p className="eyebrow">Conheça o movimento</p><h2>Onde trabalha</h2></div><button className="icon-button" aria-label="Ampliar mapa muscular" onClick={() => dialog.current?.showModal()}><Expand size={20} /></button></div>
    <div className="muscle-views">{drawing('front')}{drawing('back')}</div>
    {labels()}<p className="muscle-feedback" role="status">{message}</p>
    <small className="muscle-disclaimer">Mapa simplificado de regiões. As cores indicam o papel no exercício, não intensidade, fadiga ou ativação medida.{curation.reviewStatus === 'em-revisao' ? ' Classificação do catálogo em revisão.' : ''}</small>
    <dialog ref={dialog} className="muscle-map-dialog" aria-label="Mapa muscular ampliado"><header><h2>Onde trabalha</h2><button className="icon-button" aria-label="Fechar mapa" onClick={() => dialog.current?.close()}><X /></button></header><div className="muscle-views">{drawing('front')}{drawing('back')}</div>{labels()}<p className="muscle-feedback" role="status">{message}</p></dialog>
  </section>
}
