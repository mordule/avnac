import type { BgValue } from '../../components/background-popover'
import { angleFromPoints } from '../../scene-engine/primitives'
import { createEmptyAvnacDocument, type SceneObject, type SceneText } from '../avnac-scene'
import {
  layoutSceneText,
  renderAvnacDocumentToCanvas,
  sceneTextLineHeight,
} from '../avnac-scene-render'
import type { DesignElement, DesignSpec } from './spec'

function splitTopLevel(input: string): string[] {
  const parts: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of input) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      parts.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  if (cur.trim()) parts.push(cur.trim())
  return parts
}

/** Parses a solid color or `linear-gradient(<angle>deg | to <side>, c1 [p%], ...)`. */
export function parseBackground(value: string): BgValue {
  const m = /^\s*linear-gradient\((.*)\)\s*$/i.exec(value)
  if (!m) return { type: 'solid', color: value }
  const parts = splitTopLevel(m[1])
  let angle = 180
  const first = /^(-?[\d.]+)deg$/i.exec(parts[0] ?? '')
  if (first) {
    angle = Number(first[1])
    parts.shift()
  } else if (/^to\s/i.test(parts[0] ?? '')) {
    const dir = (parts.shift() ?? '').toLowerCase()
    angle = dir.includes('right') ? 90 : dir.includes('left') ? 270 : dir.includes('top') ? 0 : 180
  }
  const stops = parts.map((p, i) => {
    const sm = /^(.*?)\s+(-?[\d.]+)%$/.exec(p)
    return {
      color: (sm ? sm[1] : p).trim(),
      offset: sm ? Number(sm[2]) / 100 : parts.length > 1 ? i / (parts.length - 1) : 0,
    }
  })
  if (stops.length === 0) return { type: 'solid', color: '#ffffff' }
  if (stops.length === 1) return { type: 'solid', color: stops[0].color }
  return {
    type: 'gradient',
    css: `linear-gradient(${angle}deg, ${stops.map(s => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ')})`,
    stops,
    angle,
  }
}

const NO_STROKE: BgValue = { type: 'solid', color: 'transparent' }
const base = (e: {
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  opacity?: number
}) => ({
  id: crypto.randomUUID(),
  x: e.x,
  y: e.y,
  width: e.width,
  height: e.height,
  rotation: e.rotation ?? 0,
  opacity: e.opacity ?? 1,
  visible: true,
  locked: false,
  blurPct: 0,
  shadow: null,
})

function toSceneObject(e: DesignElement): SceneObject {
  switch (e.type) {
    case 'rect':
      return {
        ...base(e),
        type: 'rect',
        fill: parseBackground(e.fill),
        stroke: e.stroke ? { type: 'solid', color: e.stroke } : NO_STROKE,
        strokeWidth: e.strokeWidth ?? 0,
        cornerRadius: e.cornerRadius ?? 0,
      }
    case 'ellipse':
      return {
        ...base(e),
        type: 'ellipse',
        fill: parseBackground(e.fill),
        stroke: e.stroke ? { type: 'solid', color: e.stroke } : NO_STROKE,
        strokeWidth: e.strokeWidth ?? 0,
      }
    case 'text': {
      const obj: SceneText = {
        ...base({ ...e, height: e.fontSize }),
        type: 'text',
        text: e.text,
        fill: { type: 'solid', color: e.fill },
        stroke: NO_STROKE,
        strokeWidth: 0,
        fontFamily: e.fontFamily,
        fontSize: e.fontSize,
        letterSpacing: e.letterSpacing,
        lineHeight: e.lineHeight,
        fontWeight: e.fontWeight,
        fontStyle: 'normal',
        underline: false,
        textAlign: e.textAlign,
      }
      obj.height = Math.max(layoutSceneText(obj).height, obj.fontSize * sceneTextLineHeight(obj))
      return obj
    }
    case 'line': {
      const width = Math.max(1, Math.hypot(e.x2 - e.x1, e.y2 - e.y1))
      const height = Math.max(8, e.strokeWidth * 3)
      return {
        ...base({
          x: (e.x1 + e.x2) / 2 - width / 2,
          y: (e.y1 + e.y2) / 2 - height / 2,
          width,
          height,
          opacity: e.opacity,
        }),
        rotation: angleFromPoints(e.x1, e.y1, e.x2, e.y2),
        type: 'line',
        stroke: { type: 'solid', color: e.stroke },
        strokeWidth: e.strokeWidth,
        lineStyle: 'solid',
        roundedEnds: false,
      }
    }
    case 'image': {
      const { naturalWidth: nw, naturalHeight: nh, src } = e.image
      // Center-crop to cover the target box.
      const scale = Math.max(e.width / nw, e.height / nh)
      const cw = e.width / scale
      const ch = e.height / scale
      return {
        ...base(e),
        type: 'image',
        src,
        naturalWidth: nw,
        naturalHeight: nh,
        crop: { x: (nw - cw) / 2, y: (nh - ch) / 2, width: cw, height: ch, rotation: 0 },
        cornerRadius: e.cornerRadius ?? 0,
      }
    }
  }
}

export function specToScene(spec: DesignSpec): { bg: BgValue; objects: SceneObject[] } {
  return { bg: parseBackground(spec.background), objects: spec.elements.map(toSceneObject) }
}

export async function renderScenePreview(
  w: number,
  h: number,
  scene: { bg: BgValue; objects: SceneObject[] },
  maxEdge = 640,
): Promise<string> {
  const doc = createEmptyAvnacDocument(w, h)
  doc.bg = scene.bg
  doc.objects = scene.objects
  doc.pages[0] = { ...doc.pages[0], bg: scene.bg, objects: scene.objects }
  // Render straight into a scaled canvas (no data-URL round trip; img.decode() stalls in hidden tabs).
  const k = Math.min(1, maxEdge / Math.max(w, h)) * Math.min(2, window.devicePixelRatio || 1)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(w * k))
  canvas.height = Math.max(1, Math.round(h * k))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not create preview canvas.')
  ctx.setTransform(k, 0, 0, k, 0, 0)
  await renderAvnacDocumentToCanvas(ctx, doc, {})
  return canvas.toDataURL('image/jpeg', 0.88)
}
