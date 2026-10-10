import { Elysia, t } from 'elysia'
import { env } from '../config/env'
import { briefSystemPrompt, designBriefSchema } from '../lib/design-brief'
import { HttpError } from '../lib/http'

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fenced ? fenced[1] : raw
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('No JSON object in model output')
  return JSON.parse(body.slice(start, end + 1))
}

/** Newer OpenAI reasoning models reject `temperature`/`max_tokens`; shape params per family. */
function chatParams(model: string, messages: ChatMessage[]) {
  if (/^(gpt-5|gpt-6|o\d)/i.test(model)) {
    return { model, messages, max_completion_tokens: 4000, reasoning_effort: 'low' }
  }
  return { model, messages, temperature: 0.9, max_tokens: 900 }
}

async function callCencori(messages: ChatMessage[]): Promise<string> {
  if (!env.CENCORI_API_KEY) {
    throw new HttpError(503, 'AI is not configured (set CENCORI_API_KEY on the server).')
  }
  const res = await fetch(`${env.CENCORI_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.CENCORI_API_KEY}`,
    },
    body: JSON.stringify(chatParams(env.CENCORI_MODEL, messages)),
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 300)
    console.error('[ai] cencori error', res.status, detail)
    if (res.status === 401 || res.status === 403) {
      throw new HttpError(502, 'Cencori rejected the API key. Check CENCORI_API_KEY.')
    }
    throw new HttpError(502, `Cencori request failed (${res.status}).`, detail)
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const content = json.choices?.[0]?.message?.content
  if (!content) throw new HttpError(502, 'Cencori returned an empty response.')
  return content
}

const catalogItem = t.Object({
  id: t.String({ maxLength: 60 }),
  description: t.Optional(t.String({ maxLength: 300 })),
  tags: t.Optional(t.String({ maxLength: 200 })),
  needsImage: t.Optional(t.Boolean()),
})

export const aiRoutes = new Elysia({ prefix: '/ai' }).post(
  '/brief',
  async ({ body }) => {
    const { prompt, width, height, catalog } = body
    const imagesEnabled = !!env.UNSPLASH_ACCESS_KEY
    const system = briefSystemPrompt(
      {
        layouts: catalog.layouts.map(l => ({
          id: l.id,
          description: l.description ?? '',
          needsImage: !!l.needsImage,
        })),
        palettes: catalog.palettes.map(p => ({ id: p.id, tags: p.tags ?? '' })),
        fonts: catalog.fonts.map(f => ({ id: f.id, tags: f.tags ?? '' })),
      },
      imagesEnabled,
    )
    const messages: ChatMessage[] = [
      { role: 'system', content: system },
      {
        role: 'user',
        content: `Canvas: ${Math.round(width)} x ${Math.round(height)} px.\nRequest: ${prompt.trim()}`,
      },
    ]

    let lastError = 'invalid output'
    for (let attempt = 0; attempt < 2; attempt++) {
      const started = Date.now()
      const raw = await callCencori(
        attempt === 0
          ? messages
          : [
              ...messages,
              {
                role: 'user',
                content: `Your last reply was invalid (${lastError}). Reply with ONLY the JSON object.`,
              },
            ],
      )
      console.info(`[ai] brief attempt ${attempt + 1} in ${Date.now() - started}ms`)
      try {
        const parsed = designBriefSchema.safeParse(extractJson(raw))
        if (parsed.success) {
          if (!imagesEnabled) parsed.data.imageQuery = null
          return { data: parsed.data }
        }
        lastError = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e)
      }
    }
    throw new HttpError(502, 'AI could not produce a valid brief. Try rephrasing.', lastError)
  },
  {
    body: t.Object({
      prompt: t.String({ minLength: 3, maxLength: 2000 }),
      width: t.Number({ minimum: 50, maximum: 8000 }),
      height: t.Number({ minimum: 50, maximum: 8000 }),
      catalog: t.Object({
        layouts: t.Array(catalogItem, { maxItems: 40 }),
        palettes: t.Array(catalogItem, { maxItems: 60 }),
        fonts: t.Array(catalogItem, { maxItems: 60 }),
      }),
    }),
  },
)
