/** Intermediate design description produced by layouts and converted into scene objects. */

type Base = { x: number; y: number; rotation?: number; opacity?: number }

export type ImageAsset = { src: string; naturalWidth: number; naturalHeight: number }

export type DesignElement =
  | (Base & {
      type: 'rect'
      width: number
      height: number
      /** Solid color or CSS linear-gradient. */
      fill: string
      stroke?: string
      strokeWidth?: number
      cornerRadius?: number
    })
  | (Base & {
      type: 'ellipse'
      width: number
      height: number
      fill: string
      stroke?: string
      strokeWidth?: number
    })
  | (Base & {
      type: 'text'
      text: string
      width: number
      fontSize: number
      fontFamily: string
      fontWeight: number
      letterSpacing: number
      lineHeight: number
      textAlign: 'left' | 'center' | 'right'
      fill: string
    })
  | {
      type: 'line'
      x1: number
      y1: number
      x2: number
      y2: number
      stroke: string
      strokeWidth: number
      opacity?: number
    }
  | (Base & {
      type: 'image'
      width: number
      height: number
      image: ImageAsset
      cornerRadius?: number
    })

export type DesignSpec = { background: string; elements: DesignElement[] }

export type DesignBrief = {
  format: string
  kicker?: string
  headline: string
  subhead?: string
  body?: string
  details: string[]
  cta?: string
  imageQuery?: string | null
  layouts: string[]
  palettes: string[]
  fonts: string[]
}
