import type { DesignBrief, DesignElement, ImageAsset } from './spec'
import { type FitStyle, fitText } from './text-fit'
import type { FontPair, Palette } from './tokens'

export type LayoutCtx = {
  w: number
  h: number
  /** Shorter artboard side. */
  s: number
  /** Outer margin. */
  m: number
  /** Stroke unit (1px at 1080). */
  u: number
  orient: 'portrait' | 'landscape' | 'square'
  brief: DesignBrief
  p: Palette
  f: FontPair
  image: ImageAsset | null
}

export type Layout = {
  id: string
  description: string
  needsImage: boolean
  build: (c: LayoutCtx) => { background: string; elements: DesignElement[] }
}

type Role = 'display' | 'sub' | 'body' | 'label'
type Align = 'left' | 'center' | 'right'

type Typeset = {
  h: number
  w: number
  size: number
  place: (x: number, y: number) => DesignElement
}

function roleConfig(c: LayoutCtx, role: Role) {
  const body = c.f.body.family
  switch (role) {
    case 'display':
      return {
        style: c.f.display as FitStyle,
        upper: c.f.display.upper,
        max: c.s * 0.24,
        min: c.s * 0.05,
        lines: 5,
      }
    case 'sub':
      return {
        style: { family: body, weight: 500, tracking: -0.005, lineHeight: 1.25 },
        upper: false,
        max: c.s * 0.046,
        min: c.s * 0.026,
        lines: 3,
      }
    case 'body':
      return {
        style: { family: body, weight: 400, tracking: 0, lineHeight: 1.45 },
        upper: false,
        max: c.s * 0.03,
        min: c.s * 0.021,
        lines: 5,
      }
    case 'label':
      return {
        style: { family: body, weight: 700, tracking: 0.14, lineHeight: 1.3 },
        upper: true,
        max: c.s * 0.022,
        min: c.s * 0.016,
        lines: 2,
      }
  }
}

function tx(
  c: LayoutCtx,
  role: Role,
  raw: string,
  width: number,
  opts: {
    color: string
    align?: Align
    maxH?: number
    maxSize?: number
    maxLines?: number
    opacity?: number
  },
): Typeset {
  const cfg = roleConfig(c, role)
  const text = cfg.upper ? raw.toUpperCase() : raw
  const fit = fitText(text, cfg.style, {
    maxWidth: width,
    maxHeight: opts.maxH ?? Number.POSITIVE_INFINITY,
    maxSize: Math.min(opts.maxSize ?? cfg.max, cfg.max * 1.6),
    minSize: cfg.min,
    maxLines: opts.maxLines ?? cfg.lines,
  })
  const align = opts.align ?? 'left'
  const slack = Math.max(4, fit.size * 0.3)
  return {
    h: fit.height,
    w: fit.widest,
    size: fit.size,
    // Lines are pre-broken with \n, so a wider box can't re-join them; the slack only
    // guards against the renderer re-wrapping a line that measures a hair over the limit.
    place: (x, y) => ({
      type: 'text',
      x: align === 'center' ? x - slack / 2 : align === 'right' ? x - slack : x,
      y,
      width: width + slack,
      text: fit.lines.join('\n'),
      fontSize: fit.size,
      fontFamily: cfg.style.family,
      fontWeight: cfg.style.weight,
      letterSpacing: Math.round(cfg.style.tracking * fit.size * 100) / 100,
      lineHeight: cfg.style.lineHeight,
      textAlign: align,
      fill: opts.color,
      opacity: opts.opacity,
    }),
  }
}

function pill(c: LayoutCtx, label: string, bg: string, fg: string) {
  const t = tx(c, 'label', label, c.w, { color: fg, maxSize: c.s * 0.024, maxLines: 1 })
  const padX = t.size * 1.4
  const padY = t.size * 0.85
  const w = t.w + padX * 2
  const h = t.h + padY * 2
  return {
    w,
    h,
    place: (x: number, y: number): DesignElement[] => [
      { type: 'rect', x, y, width: w, height: h, fill: bg, cornerRadius: h / 2 },
      {
        ...(t.place(x + padX, y + padY) as Extract<DesignElement, { type: 'text' }>),
        width: t.w + 4,
      },
    ],
  }
}

function rule(x: number, y: number, len: number, color: string, weight: number): DesignElement {
  return { type: 'line', x1: x, y1: y, x2: x + len, y2: y, stroke: color, strokeWidth: weight }
}

const detailsLine = (b: DesignBrief) => b.details.filter(Boolean).join('   ·   ')

function cover(
  image: ImageAsset,
  x: number,
  y: number,
  width: number,
  height: number,
  cornerRadius = 0,
): DesignElement {
  return { type: 'image', x, y, width, height, image, cornerRadius }
}

/** Bottom-up stacking helper: returns y positions for items of given heights ending at `bottom`. */
function stackUp(bottom: number, items: { h: number; gap: number }[]): number[] {
  const ys: number[] = []
  let y = bottom
  for (let i = items.length - 1; i >= 0; i--) {
    y -= items[i].h
    ys[i] = y
    y -= items[i].gap
  }
  return ys
}

// ---------------------------------------------------------------------------

const typePoster: Layout = {
  id: 'type-poster',
  description:
    'Typographic poster: kicker top-left, huge left-aligned headline, accent circle, details at bottom. No photo.',
  needsImage: false,
  build: c => {
    const { w, h, s, m, u, p, brief } = c
    const els: DesignElement[] = []
    const innerW = w - m * 2
    let y = m
    if (brief.kicker) {
      const k = tx(c, 'label', brief.kicker, innerW, {
        color: p.accent === p.ink ? p.muted : p.accent,
      })
      els.push(k.place(m, y))
      y += k.h + s * 0.035
    }
    const det = brief.details.length
      ? tx(c, 'label', brief.details.join('\n'), w * 0.5, { color: p.ink, maxLines: 4 })
      : null
    const sub = brief.subhead
      ? tx(c, 'sub', brief.subhead, Math.min(innerW, s * 0.78), { color: p.muted })
      : null
    const cta = brief.cta ? pill(c, brief.cta, p.ink, p.bg) : null
    const bottomH = (det ? det.h + s * 0.05 : 0) + (cta ? cta.h + s * 0.04 : 0)
    const subH = sub ? sub.h + s * 0.035 : 0
    const head = tx(c, 'display', brief.headline, innerW, {
      color: p.ink,
      maxH: h - y - m - bottomH - subH - s * 0.04,
    })
    els.push(head.place(m, y))
    y += head.h + s * 0.035
    if (sub) {
      els.push(sub.place(m, y))
      y += sub.h
    }
    let by = h - m
    if (det) {
      by -= det.h
      els.push(det.place(m, by))
      by -= s * 0.03
      els.push(rule(m, by, s * 0.12, p.ink, 4 * u))
      by -= s * 0.02
    }
    if (cta) els.push(...cta.place(m, Math.max(y + s * 0.04, by - cta.h - s * 0.02)))
    // Decor circle sits in the free bottom-right corner below the full-width text; skip if no room.
    const r = s * 0.36
    const cy = Math.max(h - r * 1.25, y + s * 0.06)
    if (h - cy > r * 0.6) {
      els.unshift(
        { type: 'ellipse', x: w - r * 1.35, y: cy, width: r * 2, height: r * 2, fill: p.accent },
        {
          type: 'ellipse',
          x: w - r * 1.6,
          y: cy - r * 0.25,
          width: r * 2,
          height: r * 2,
          fill: 'transparent',
          stroke: p.ink,
          strokeWidth: 2 * u,
          opacity: 0.35,
        },
      )
    }
    return { background: p.bg, elements: els }
  },
}

const centeredFrame: Layout = {
  id: 'centered-frame',
  description:
    'Elegant centered composition inside a thin inset frame with ornament rules. Great for invitations, menus, quotes. No photo.',
  needsImage: false,
  build: c => {
    const { w, h, s, m, u, p, brief } = c
    const els: DesignElement[] = []
    const inset = m * 0.5
    els.push({
      type: 'rect',
      x: inset,
      y: inset,
      width: w - inset * 2,
      height: h - inset * 2,
      fill: 'transparent',
      stroke: p.accent,
      strokeWidth: 2.5 * u,
    })
    els.push({
      type: 'rect',
      x: inset + 10 * u,
      y: inset + 10 * u,
      width: w - (inset + 10 * u) * 2,
      height: h - (inset + 10 * u) * 2,
      fill: 'transparent',
      stroke: p.accent,
      strokeWidth: 1 * u,
      opacity: 0.5,
    })
    const innerW = w - m * 2.6
    const x = (w - innerW) / 2
    const k = brief.kicker
      ? tx(c, 'label', brief.kicker, innerW, { color: p.accent, align: 'center' })
      : null
    const sub = brief.subhead
      ? tx(c, 'sub', brief.subhead, innerW * 0.85, { color: p.muted, align: 'center' })
      : null
    const dl = detailsLine(brief)
    const det = dl
      ? tx(c, 'label', dl, innerW, { color: p.ink, align: 'center', maxLines: 3 })
      : null
    const cta = brief.cta ? pill(c, brief.cta, p.accent, p.onAccent) : null
    const g = s * 0.04
    const fixed =
      (k ? k.h + g : 0) +
      g * 1.2 +
      (sub ? sub.h + g : 0) +
      (det ? det.h + g * 1.5 : 0) +
      (cta ? cta.h + g : 0)
    const head = tx(c, 'display', brief.headline, innerW, {
      color: p.ink,
      align: 'center',
      maxH: h - m * 2.4 - fixed,
    })
    const total = fixed + head.h
    let y = (h - total) / 2
    if (k) {
      els.push(k.place(x, y))
      y += k.h + g
    }
    els.push(head.place(x, y))
    y += head.h + g * 0.6
    els.push(rule(w / 2 - s * 0.05, y, s * 0.1, p.accent, 2.5 * u))
    y += g * 0.6
    if (sub) {
      els.push(sub.place(x + innerW * 0.075, y))
      y += sub.h + g
    }
    if (det) {
      y += g * 0.5
      els.push(det.place(x, y))
      y += det.h + g
    }
    if (cta) els.push(...cta.place((w - cta.w) / 2, y))
    return { background: p.bg, elements: els }
  },
}

const splitPhoto: Layout = {
  id: 'split-photo',
  description:
    'Photo fills one half (top on portrait, right on landscape), text block in the other half with a kicker pill.',
  needsImage: true,
  build: c => {
    const { w, h, s, m, p, brief, image } = c
    const els: DesignElement[] = []
    if (!image) return { background: p.bg, elements: els }
    const landscape = c.orient === 'landscape'
    const box = landscape ? { x: 0, y: 0, w: w * 0.5, h } : { x: 0, y: m * 0.0, w, h: h * 0.52 }
    const text = landscape
      ? { x: w * 0.5 + m, y: m, w: w * 0.5 - m * 2, h: h - m * 2 }
      : { x: m, y: box.h + m * 0.9, w: w - m * 2, h: h - box.h - m * 1.9 }
    els.push({
      type: 'rect',
      x: landscape ? 0 : 0,
      y: 0,
      width: landscape ? w * 0.5 : w,
      height: box.h,
      fill: p.surface,
    })
    els.push(cover(image, landscape ? 0 : 0, 0, box.w, box.h))
    let y = text.y
    if (brief.kicker) {
      const k = pill(c, brief.kicker, p.accent, p.onAccent)
      const ky = landscape ? y : box.h - k.h / 2
      els.push(...k.place(text.x, ky))
      y = landscape ? y + k.h + s * 0.04 : ky + k.h + s * 0.035
    }
    const sub = brief.subhead ? tx(c, 'sub', brief.subhead, text.w, { color: p.muted }) : null
    const dl = detailsLine(brief)
    const det = dl ? tx(c, 'label', dl, text.w, { color: p.ink, maxLines: 3 }) : null
    const cta = brief.cta ? pill(c, brief.cta, p.ink, p.bg) : null
    const g = s * 0.03
    const fixed = (sub ? sub.h + g : 0) + (det ? det.h + g : 0) + (cta ? cta.h + g : 0)
    const head = tx(c, 'display', brief.headline, text.w, {
      color: p.ink,
      maxH: text.y + text.h - y - fixed - g,
      maxSize: s * 0.16,
    })
    if (landscape) y = Math.max(y, text.y + (text.h - (y - text.y) - head.h - fixed) / 2)
    els.push(head.place(text.x, y))
    y += head.h + g
    if (sub) {
      els.push(sub.place(text.x, y))
      y += sub.h + g
    }
    const bottom = text.y + text.h
    if (det && cta) {
      els.push(...cta.place(text.x, bottom - cta.h))
      els.push(det.place(text.x, Math.max(y, bottom - cta.h - g - det.h)))
    } else if (det) {
      els.push(det.place(text.x, Math.max(y, bottom - det.h)))
    } else if (cta) {
      els.push(...cta.place(text.x, Math.max(y, bottom - cta.h)))
    }
    return { background: p.bg, elements: els }
  },
}

const photoOverlay: Layout = {
  id: 'photo-overlay',
  description:
    'Full-bleed photo with a dark gradient scrim and white text anchored bottom-left. Cinematic, high impact.',
  needsImage: true,
  build: c => {
    const { w, h, s, m, p, brief, image } = c
    const els: DesignElement[] = []
    if (!image) return { background: p.bg, elements: els }
    els.push(cover(image, 0, 0, w, h))
    els.push({ type: 'rect', x: 0, y: 0, width: w, height: h, fill: '#000000', opacity: 0.12 })
    els.push({
      type: 'rect',
      x: 0,
      y: h * 0.3,
      width: w,
      height: h * 0.7,
      fill: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.82) 100%)',
    })
    const textW = c.orient === 'landscape' ? w * 0.6 : w - m * 2
    const white = '#FFFFFF'
    const g = s * 0.03
    const k = brief.kicker
      ? tx(c, 'label', brief.kicker, textW, { color: p.accent === p.ink ? white : p.accent })
      : null
    const sub = brief.subhead
      ? tx(c, 'sub', brief.subhead, textW * 0.9, { color: white, opacity: 0.85 })
      : null
    const dl = detailsLine(brief)
    const det = dl ? tx(c, 'label', dl, textW, { color: white, maxLines: 3, opacity: 0.9 }) : null
    const cta = brief.cta
      ? pill(
          c,
          brief.cta,
          p.accent === p.ink ? white : p.accent,
          p.accent === p.ink ? '#111111' : p.onAccent,
        )
      : null
    const fixed =
      (k ? k.h + g : 0) +
      (sub ? sub.h + g : 0) +
      (det ? det.h + g * 1.4 : 0) +
      (cta ? cta.h + g * 1.4 : 0)
    const head = tx(c, 'display', brief.headline, textW, { color: white, maxH: h * 0.62 - fixed })
    const items: { h: number; gap: number; place: (y: number) => DesignElement[] }[] = []
    if (k) items.push({ h: k.h, gap: g, place: y => [k.place(m, y)] })
    items.push({ h: head.h, gap: g, place: y => [head.place(m, y)] })
    if (sub) items.push({ h: sub.h, gap: g * 1.4, place: y => [sub.place(m, y)] })
    if (cta) items.push({ h: cta.h, gap: g * 1.4, place: y => cta.place(m, y) })
    if (det) items.push({ h: det.h, gap: 0, place: y => [det.place(m, y)] })
    const ys = stackUp(h - m, items)
    items.forEach((it, i) => {
      els.push(...it.place(ys[i]))
    })
    return { background: '#111111', elements: els }
  },
}

const colorBlock: Layout = {
  id: 'color-block',
  description:
    'Big accent color block holding the headline, supporting copy on a light surface beside/below it. Modern and graphic. No photo.',
  needsImage: false,
  build: c => {
    const { w, h, s, m, p, brief } = c
    const els: DesignElement[] = []
    const landscape = c.orient === 'landscape'
    const block = landscape ? { x: 0, y: 0, w: w * 0.52, h } : { x: 0, y: 0, w, h: h * 0.56 }
    els.push({ type: 'rect', x: 0, y: 0, width: block.w, height: block.h, fill: p.accent })
    els.push({
      type: 'ellipse',
      x: block.w - s * 0.22,
      y: block.h - s * 0.22,
      width: s * 0.44,
      height: s * 0.44,
      fill: p.onAccent,
      opacity: 0.08,
    })
    const inW = block.w - m * 2
    let ky = m
    if (brief.kicker) {
      const k = tx(c, 'label', brief.kicker, inW, { color: p.onAccent, opacity: 0.85 })
      els.push(k.place(m, ky))
      ky += k.h + s * 0.03
    }
    const head = tx(c, 'display', brief.headline, inW, {
      color: p.onAccent,
      maxH: block.h - ky - m,
    })
    els.push(head.place(m, block.h - m - head.h))

    const area = landscape
      ? { x: block.w + m, y: m, w: w - block.w - m * 2, h: h - m * 2 }
      : { x: m, y: block.h + m * 0.9, w: w - m * 2, h: h - block.h - m * 1.9 }
    let y = area.y
    const g = s * 0.028
    if (brief.subhead) {
      const sub = tx(c, 'sub', brief.subhead, area.w, { color: p.ink })
      els.push(sub.place(area.x, y))
      y += sub.h + g
    }
    if (brief.body) {
      const body = tx(c, 'body', brief.body, area.w, {
        color: p.muted,
        maxH: area.y + area.h - y - s * 0.12,
      })
      els.push(body.place(area.x, y))
      y += body.h + g
    }
    const bottom = area.y + area.h
    const cta = brief.cta ? pill(c, brief.cta, p.accent, p.onAccent) : null
    const dl = brief.details.length
      ? tx(c, 'label', brief.details.join('\n'), area.w, { color: p.ink, maxLines: 4 })
      : null
    let by = bottom
    if (cta) {
      by -= cta.h
      els.push(...cta.place(area.x, Math.max(y, by)))
      by -= g
    }
    if (dl) els.push(dl.place(area.x, Math.max(y, by - dl.h)))
    return { background: p.bg, elements: els }
  },
}

const statement: Layout = {
  id: 'statement',
  description:
    'Bold statement: vivid accent background, massive centered headline, CTA pill below. Announcements, sales, quotes. No photo.',
  needsImage: false,
  build: c => {
    const { w, h, s, m, u, p, brief } = c
    const els: DesignElement[] = []
    const innerW = w - m * 2
    const fg = p.onAccent
    const g = s * 0.04
    const k = brief.kicker
      ? tx(c, 'label', brief.kicker, innerW, { color: fg, align: 'center' })
      : null
    const sub = brief.subhead
      ? tx(c, 'sub', brief.subhead, innerW * 0.8, { color: fg, align: 'center', opacity: 0.85 })
      : null
    const cta = brief.cta ? pill(c, brief.cta, fg, p.accent) : null
    const dl = detailsLine(brief)
    const det = dl
      ? tx(c, 'label', dl, innerW, { color: fg, align: 'center', maxLines: 2, opacity: 0.85 })
      : null
    const topH = k ? m + k.h + g * 1.6 : m
    const botH = m + (det ? det.h + g : 0)
    const midFixed = (sub ? sub.h + g : 0) + (cta ? cta.h + g * 1.2 : 0)
    const head = tx(c, 'display', brief.headline, innerW, {
      color: fg,
      align: 'center',
      maxH: h - topH - botH - midFixed - g,
    })
    if (k) {
      els.push(k.place(m, m))
      els.push(rule(w / 2 - s * 0.04, m + k.h + g * 0.6, s * 0.08, fg, 3 * u))
    }
    const block = head.h + midFixed
    let y = topH + Math.max(0, (h - topH - botH - block) / 2)
    els.push(head.place(m, y))
    y += head.h + g
    if (sub) {
      els.push(sub.place(m + innerW * 0.1, y))
      y += sub.h + g * 1.2
    }
    if (cta) els.push(...cta.place((w - cta.w) / 2, y))
    if (det) els.push(det.place(m, h - m - det.h))
    return { background: p.accent, elements: els }
  },
}

const editorial: Layout = {
  id: 'editorial',
  description:
    'Magazine/editorial grid: top bar with rules, large left-aligned headline, optional photo band, details in columns at the bottom.',
  needsImage: false,
  build: c => {
    const { w, h, s, m, u, p, brief, image } = c
    const els: DesignElement[] = []
    const innerW = w - m * 2
    const g = s * 0.03
    let y = m
    const left = brief.kicker ?? brief.format
    const right = brief.details[0]
    const lk = tx(c, 'label', left, innerW * 0.6, { color: p.ink })
    els.push(lk.place(m, y))
    if (right) {
      const rk = tx(c, 'label', right, innerW * 0.38, {
        color: p.muted,
        align: 'right',
        maxLines: 1,
      })
      els.push(rk.place(m + innerW * 0.62, y))
    }
    y += lk.h + g * 0.6
    els.push(rule(m, y, innerW, p.ink, 2 * u))
    y += g * 1.3

    const rest = brief.details.slice(right ? 1 : 0)
    const colCount = Math.min(3, rest.length)
    const cols = rest
      .slice(0, colCount)
      .map(d =>
        tx(c, 'label', d, innerW / Math.max(1, colCount) - g, { color: p.ink, maxLines: 2 }),
      )
    const colsH = cols.length ? Math.max(...cols.map(cc => cc.h)) + g * 1.6 : 0
    const sub = brief.subhead
      ? tx(c, 'sub', brief.subhead, innerW * (c.orient === 'landscape' ? 0.55 : 0.8), {
          color: p.muted,
        })
      : null
    const subH = sub ? sub.h + g : 0
    const useImage = !!image && h - y - colsH - subH - m > s * 0.55
    const headMaxH = useImage ? s * 0.36 : h - y - colsH - subH - m - g
    const head = tx(c, 'display', brief.headline, innerW, { color: p.ink, maxH: headMaxH })
    const bottom = h - m - colsH
    if (useImage && image) {
      els.push(head.place(m, y))
      y += head.h + g
      if (sub) {
        els.push(sub.place(m, y))
        y += sub.h + g
      }
      els.push(cover(image, m, y + g * 0.3, innerW, bottom - y - g * 0.6, 4 * u))
    } else {
      // Swiss-style: accent mark under the top rule, type anchored to the bottom.
      let ty = bottom - g - (sub ? sub.h + g : 0) - head.h
      const mark = s * 0.09
      if (ty - y > mark + g * 2)
        els.push({ type: 'rect', x: m, y, width: mark, height: mark, fill: p.accent })
      ty = Math.max(y, ty)
      els.push(head.place(m, ty))
      ty += head.h + g
      if (sub) els.push(sub.place(m, ty))
    }
    if (cols.length) {
      const ry = h - m - colsH + g * 0.6
      els.push(rule(m, ry, innerW, p.ink, 2 * u))
      const cw = innerW / cols.length
      cols.forEach((cc, i) => {
        els.push(cc.place(m + i * cw, ry + g))
      })
    }
    return { background: p.bg, elements: els }
  },
}

export const LAYOUTS: Layout[] = [
  typePoster,
  centeredFrame,
  splitPhoto,
  photoOverlay,
  colorBlock,
  statement,
  editorial,
]

export const layoutById = (id: string) => LAYOUTS.find(l => l.id === id)

export function buildLayout(
  layout: Layout,
  args: {
    w: number
    h: number
    brief: DesignBrief
    p: Palette
    f: FontPair
    image: ImageAsset | null
  },
) {
  const { w, h } = args
  const s = Math.min(w, h)
  const ratio = w / h
  const ctx: LayoutCtx = {
    ...args,
    s,
    m: Math.round(s * 0.075),
    u: s / 1080,
    orient: ratio > 1.15 ? 'landscape' : ratio < 0.87 ? 'portrait' : 'square',
  }
  return layout.build(ctx)
}
