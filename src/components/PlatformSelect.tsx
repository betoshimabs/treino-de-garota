import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'

/** Platform selection: native modal focus management, branded choices, no device select menu. */
export function PlatformSelect({ label, hint, value, options, onChange }: { label: string; hint?: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return <div className="field"><span id={id}>{label} {hint && <small>{hint}</small>}</span><button type="button" className="platform-select-trigger" aria-labelledby={id + ' ' + id + '-value'} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><span id={id + '-value'}>{options.find(option => option.value === value)?.label ?? 'Selecionar'}</span><ChevronDown size={18} /></button>{open && <SelectionDialog title={label} options={options} value={value} close={() => setOpen(false)} select={next => { onChange(next); setOpen(false) }} />}</div>
}
function SelectionDialog({ title, options, value, close, select }: { title: string; options: { value: string; label: string }[]; value: string; close: () => void; select: (value: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null
    const dialog = ref.current!
    dialog.showModal()
    dialog.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus()
    return () => { dialog.close(); if (trigger?.isConnected) trigger.focus() }
  }, [])
  return <dialog ref={ref} className="guide-dialog platform-selection-dialog" aria-labelledby={id} onCancel={event => { event.preventDefault(); event.stopPropagation(); close() }}><header><div><small className="guide-eyebrow">Do seu jeito</small><h2 id={id}>{title}</h2></div><button type="button" className="icon-button" aria-label="Fechar opções" onClick={close}><X /></button></header><div className="platform-select-options">{options.map(option => <button type="button" key={option.value} aria-pressed={option.value === value} onClick={() => select(option.value)}>{option.label}{option.value === value && <Check size={18} />}</button>)}</div></dialog>
}
