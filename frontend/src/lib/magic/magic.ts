import type { BgValue } from '../../components/background-popover'
import { loadImageMetadata } from '../avnac-image-proxy'
import type { SceneObject } from '../avnac-scene'
import { ensureGoogleFontsForFamilies } from '../load-google-font'
import { getPublicApiBase } from '../public-api-base'
import { fetchUnsplashSearch } from '../unsplash-api'
import { buildLayout, LAYOUTS, type Layout, layoutById } from './layouts'
import { renderScenePreview, specToScene } from './scene-build'
import type { DesignBrief, ImageAsset } from './spec'
import {
  FONT_PAIRS,
  type FontPair,
  fontPairById,
  PALETTES,
  type Palette,
  paletteById,
} from './tokens'

export type MagicVariant = {
  key: string
  layout: Layout
  palette: Palette
  fonts: FontPair
  scene: { bg: BgValue; objects: SceneObject[] }
  preview: string
}

export type MagicSession = {
  brief: DesignBrief
  image: ImageAsset | null
  w: number
  h: number
}

const CATALOG = {
  layouts: LAYOUTS.map(l => ({ id: l.id, description: l.description, needsImage: l.needsImage })),
  palettes: PALETTES.map(p => ({ id: p.id, tags: p.tags })),
  fonts: FONT_PAIRS.map(f => ({ id: f.id, tags: f.tags })),
}

export async function requestBrief(prompt: string, w: number, h: number, signal?: AbortSignal) {
  const res = await fetch(`${getPublicApiBase()}/ai/brief`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ prompt, width: w, height: h, catalog: CATALOG }),
    signal,
  })
  const json = (await res.json().catch(() => null)) as { data?: DesignBrief; error?: string } | null
  if (!res.ok || !json?.data) throw new Error(json?.error ?? `Request failed (${res.status})`)
  return json.data
}

async function findImage(query: string, w: number, h: number): Promise<ImageAsset | null> {
  try {
    const { photos } = await fetchUnsplashSearch(query, 1, 6)
    if (!photos.length) return null
    const target = w / h
    const best = [...photos].sort(
      (a, b) =>
        Math.abs(Math.log(a.width / a.height / target)) -
        Math.abs(Math.log(b.width / b.height / target)),
    )[0]
    return await loadImageMetadata(best.urls.regular)
  } catch {
    return null
  }
}

/** Resolve the photo (if any) for a brief. */
export async function startSession(
  brief: DesignBrief,
  w: number,
  h: number,
): Promise<MagicSession> {
  const image = brief.imageQuery ? await findImage(brief.imageQuery, w, h) : null
  return { brief, image, w, h }
}

function ranked<T extends { id: string }>(
  ids: string[],
  all: T[],
  byId: (id: string) => T | undefined,
): T[] {
  const picked = ids.map(byId).filter((x): x is T => !!x)
  const seen = new Set(picked.map(x => x.id))
  return [...picked, ...all.filter(x => !seen.has(x.id))]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Builds `count` variants. Round 0 follows the model's ranking; later rounds remix
 * from the model's top picks so results stay on-brief but fresh.
 */
export async function buildVariants(
  session: MagicSession,
  round: number,
  count = 4,
): Promise<MagicVariant[]> {
  const { brief, image, w, h } = session
  const usable = (l: Layout) => !l.needsImage || !!image
  let layouts = ranked(brief.layouts, LAYOUTS, layoutById).filter(usable)
  let palettes = ranked(brief.palettes, PALETTES, paletteById)
  let fonts = ranked(brief.fonts, FONT_PAIRS, fontPairById)
  if (image && round === 0) {
    // Lead with a photo layout when we have a photo.
    const photo = layouts.find(l => l.needsImage)
    if (photo && !layouts.slice(0, 2).includes(photo))
      layouts = [photo, ...layouts.filter(l => l !== photo)]
  }
  if (round > 0) {
    layouts = shuffle(layouts)
    palettes = shuffle(palettes.slice(0, 6))
    fonts = shuffle(fonts.slice(0, 6))
  }
  const combos = Array.from({ length: count }, (_, i) => ({
    layout: layouts[i % layouts.length],
    palette: palettes[i % palettes.length],
    fonts: fonts[i % fonts.length],
  }))
  await ensureGoogleFontsForFamilies(
    combos.flatMap(c => [c.fonts.display.family, c.fonts.body.family]),
  )
  return Promise.all(
    combos.map(async (c, i) => {
      const spec = buildLayout(c.layout, { w, h, brief, p: c.palette, f: c.fonts, image })
      const scene = specToScene(spec)
      const preview = await renderScenePreview(w, h, scene)
      return {
        key: `${round}-${i}-${c.layout.id}-${c.palette.id}-${c.fonts.id}`,
        ...c,
        scene,
        preview,
      }
    }),
  )
}
