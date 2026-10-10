let measureCtx: CanvasRenderingContext2D | null = null

function ctx(): CanvasRenderingContext2D {
  if (!measureCtx) {
    const c = document.createElement('canvas')
    measureCtx = c.getContext('2d')
    if (!measureCtx) throw new Error('Canvas 2D unavailable')
  }
  return measureCtx
}

export type FitStyle = {
  family: string
  weight: number
  /** em */
  tracking: number
  lineHeight: number
}

function lineWidth(text: string, style: FitStyle, size: number): number {
  const c = ctx()
  c.font = `normal ${style.weight} ${size}px "${style.family}", sans-serif`
  const chars = Array.from(text)
  return c.measureText(text).width + Math.max(0, chars.length - 1) * style.tracking * size
}

/** Greedy word wrap. Returns lines and whether any single word overflowed. */
export function wrapText(text: string, style: FitStyle, size: number, maxWidth: number) {
  const lines: string[] = []
  let overflow = false
  let widest = 0
  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    let cur = ''
    for (const word of words) {
      const next = cur ? `${cur} ${word}` : word
      if (!cur || lineWidth(next, style, size) <= maxWidth) {
        cur = next
      } else {
        lines.push(cur)
        cur = word
      }
    }
    lines.push(cur)
  }
  for (const l of lines) {
    const lw = lineWidth(l, style, size)
    widest = Math.max(widest, lw)
    if (lw > maxWidth + 0.5) overflow = true
  }
  return { lines, overflow, widest }
}

export type FitResult = { size: number; lines: string[]; height: number; widest: number }

/** Largest font size in [minSize, maxSize] whose wrapped text fits the box. */
export function fitText(
  text: string,
  style: FitStyle,
  opts: {
    maxWidth: number
    maxHeight: number
    maxSize: number
    minSize: number
    maxLines?: number
  },
): FitResult {
  const maxLines = opts.maxLines ?? 99
  const attempt = (size: number) => {
    const r = wrapText(text, style, size, opts.maxWidth)
    const height = r.lines.length * size * style.lineHeight
    const ok = !r.overflow && r.lines.length <= maxLines && height <= opts.maxHeight
    return { ok, size, lines: r.lines, height, widest: r.widest }
  }
  let lo = Math.max(1, Math.floor(opts.minSize))
  let hi = Math.max(lo, Math.floor(opts.maxSize))
  let best = attempt(lo)
  if (!best.ok) return best
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    const r = attempt(mid)
    if (r.ok) {
      best = r
      lo = mid
    } else {
      hi = mid - 1
    }
  }
  return best
}
