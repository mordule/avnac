import { AiMagicIcon, Cancel01Icon, RefreshIcon, SentIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { type MutableRefObject, useEffect, useRef, useState } from 'react'
import type { AiDesignController } from '../lib/avnac-ai-controller'
import { pickMagicQuickPrompts } from '../lib/avnac-magic-quick-prompts'
import {
  editorSidebarPanelLeftClass,
  editorSidebarPanelTopClass,
} from '../lib/editor-sidebar-panel-layout'
import {
  buildVariants,
  type MagicSession,
  type MagicVariant,
  requestBrief,
  startSession,
} from '../lib/magic/magic'
import { useAiController } from './scene-editor/ai-controller-context'

type Props = {
  open: boolean
  onClose: () => void
}

export default function EditorAiPanel({ open, onClose }: Props) {
  const controller = useAiController()
  const controllerRef = useRef<AiDesignController | null>(controller)
  useEffect(() => {
    controllerRef.current = controller
  }, [controller])

  const [magicQuickPrompts] = useState(() => pickMagicQuickPrompts())

  if (!open) return null

  return (
    <div
      data-avnac-chrome
      className={[
        'pointer-events-auto fixed z-40 flex w-[min(100vw-1.5rem,400px)] flex-col overflow-hidden rounded-3xl border border-black/[0.08] bg-white/95 backdrop-blur-md',
        'bottom-3',
        editorSidebarPanelLeftClass,
        editorSidebarPanelTopClass,
      ].join(' ')}
      role="dialog"
      aria-label="Magic"
    >
      <div className="flex items-center justify-between border-b border-black/[0.06] px-3 py-2">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={AiMagicIcon}
            size={16}
            strokeWidth={1.9}
            className="avnac-ai-accent"
          />
          <span className="avnac-ai-gradient-text text-sm font-semibold">Magic</span>
          <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
            beta
          </span>
        </div>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 hover:bg-black/[0.06]"
          onClick={onClose}
          aria-label="Close magic"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.75} />
        </button>
      </div>

      <MagicDesigner quickPrompts={magicQuickPrompts} controllerRef={controllerRef} />
    </div>
  )
}

type Phase = 'idle' | 'writing' | 'composing' | 'ready'

const PHASE_LABEL: Record<Phase, string> = {
  idle: '',
  writing: 'Writing copy and art direction…',
  composing: 'Composing layouts…',
  ready: '',
}

function MagicDesigner({
  quickPrompts,
  controllerRef,
}: {
  quickPrompts: string[]
  controllerRef: MutableRefObject<AiDesignController | null>
}) {
  const [prompt, setPrompt] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [variants, setVariants] = useState<MagicVariant[]>([])
  const [appliedKey, setAppliedKey] = useState<string | null>(null)
  const sessionRef = useRef<MagicSession | null>(null)
  const roundRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const busy = phase === 'writing' || phase === 'composing'

  useEffect(() => () => abortRef.current?.abort(), [])

  function apply(v: MagicVariant) {
    controllerRef.current?.replaceScene(v.scene.bg, v.scene.objects)
    setAppliedKey(v.key)
  }

  async function generate(text: string) {
    const brief = text.trim()
    const controller = controllerRef.current
    const canvas = controller?.getCanvas()
    if (brief.length < 3 || busy || !canvas) return
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setError(null)
    setVariants([])
    setAppliedKey(null)
    setPhase('writing')
    try {
      const b = await requestBrief(brief, canvas.width, canvas.height, ac.signal)
      if (ac.signal.aborted) return
      setPhase('composing')
      const session = await startSession(b, canvas.width, canvas.height)
      sessionRef.current = session
      roundRef.current = 0
      const vs = await buildVariants(session, 0)
      if (ac.signal.aborted) return
      setVariants(vs)
      if (vs[0]) apply(vs[0])
      setPhase('ready')
    } catch (e) {
      if (ac.signal.aborted) return
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setPhase('idle')
    }
  }

  async function remix() {
    const session = sessionRef.current
    if (!session || busy) return
    setPhase('composing')
    try {
      roundRef.current += 1
      setVariants(await buildVariants(session, roundRef.current))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setPhase('ready')
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3">
      <form
        className="flex flex-col gap-2"
        onSubmit={e => {
          e.preventDefault()
          void generate(prompt)
        }}
      >
        <textarea
          className="min-h-[88px] resize-none rounded-xl border border-black/[0.08] bg-white p-3 text-sm outline-none focus:border-black/30"
          placeholder="Describe what you want — e.g. a poster for a jazz night at Blue Room, Friday 9pm"
          value={prompt}
          disabled={busy}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void generate(prompt)
            }
          }}
        />
        <button
          type="submit"
          disabled={busy || prompt.trim().length < 3}
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-neutral-900 text-sm font-medium text-white disabled:opacity-40"
        >
          <HugeiconsIcon icon={SentIcon} size={16} strokeWidth={1.9} />
          {busy ? PHASE_LABEL[phase] : 'Generate designs'}
        </button>
      </form>

      {error ? <p className="text-[12px] text-red-600">{error}</p> : null}

      {busy && variants.length === 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-black/[0.05]" />
          ))}
        </div>
      ) : null}

      {variants.length > 0 ? (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-neutral-500">
              Click a design to use it. ⌘Z undoes.
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => void remix()}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-neutral-700 hover:bg-black/[0.05] disabled:opacity-40"
            >
              <HugeiconsIcon icon={RefreshIcon} size={14} strokeWidth={1.9} />
              More
            </button>
          </div>
          <div className={['grid grid-cols-2 gap-2', busy ? 'opacity-50' : ''].join(' ')}>
            {variants.map(v => (
              <button
                key={v.key}
                type="button"
                disabled={busy}
                onClick={() => apply(v)}
                title={`${v.layout.id} · ${v.palette.id} · ${v.fonts.id}`}
                className={[
                  'overflow-hidden rounded-xl border-2 bg-black/[0.03] transition',
                  appliedKey === v.key
                    ? 'border-neutral-900'
                    : 'border-transparent hover:border-black/20',
                ].join(' ')}
              >
                <img src={v.preview} alt="" className="block h-auto w-full" />
              </button>
            ))}
          </div>
        </>
      ) : null}

      {variants.length === 0 && !busy ? (
        <div className="flex flex-col gap-1.5">
          {quickPrompts.map(q => (
            <button
              key={q}
              type="button"
              className="rounded-xl border border-black/[0.06] px-3 py-2 text-left text-[12px] text-neutral-700 hover:bg-black/[0.04]"
              onClick={() => {
                setPrompt(q)
                void generate(q)
              }}
            >
              {q}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
