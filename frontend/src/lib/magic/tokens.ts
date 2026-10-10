/** Curated design tokens for Magic. The model picks ids; it never invents colors or fonts. */

export type Palette = {
  id: string
  tags: string
  bg: string
  surface: string
  ink: string
  muted: string
  accent: string
  onAccent: string
}

export type TypeStyle = {
  family: string
  weight: number
  /** Letter spacing in em. */
  tracking: number
  lineHeight: number
  upper: boolean
}

export type FontPair = {
  id: string
  tags: string
  display: TypeStyle
  body: { family: string }
}

export const PALETTES: Palette[] = [
  // Dark
  {
    id: 'midnight-gold',
    tags: 'luxury, premium, night, gala, elegant',
    bg: '#0E1116',
    surface: '#1A1F27',
    ink: '#F5EFE6',
    muted: '#A39E93',
    accent: '#E8B04B',
    onAccent: '#0E1116',
  },
  {
    id: 'noir-red',
    tags: 'bold, urgent, sale, sport, cinema',
    bg: '#0B0B0B',
    surface: '#1A1A1A',
    ink: '#F2F2F2',
    muted: '#9A9A9A',
    accent: '#E63B2E',
    onAccent: '#FFFFFF',
  },
  {
    id: 'electric-night',
    tags: 'music, nightlife, tech, neon, gaming',
    bg: '#0B0820',
    surface: '#1A1442',
    ink: '#F4F1FF',
    muted: '#A49FD0',
    accent: '#3DF5C4',
    onAccent: '#0B0820',
  },
  {
    id: 'forest',
    tags: 'nature, outdoor, organic, calm, heritage',
    bg: '#13261F',
    surface: '#1C3A2F',
    ink: '#EFE9DC',
    muted: '#A9B5A6',
    accent: '#D9B26F',
    onAccent: '#13261F',
  },
  {
    id: 'deep-ocean',
    tags: 'corporate, finance, saas, trust, conference',
    bg: '#0A2540',
    surface: '#123358',
    ink: '#F6F9FC',
    muted: '#9FB3C8',
    accent: '#00D4FF',
    onAccent: '#0A2540',
  },
  {
    id: 'plum-velvet',
    tags: 'romantic, beauty, fashion, evening, wine',
    bg: '#2A1030',
    surface: '#3A1842',
    ink: '#FCE9F1',
    muted: '#C9A3B8',
    accent: '#FF8FB1',
    onAccent: '#2A1030',
  },
  // Light
  {
    id: 'paper-ink',
    tags: 'minimal, editorial, literary, monochrome, serious',
    bg: '#F4F1EA',
    surface: '#FFFFFF',
    ink: '#161616',
    muted: '#6B6760',
    accent: '#161616',
    onAccent: '#F4F1EA',
  },
  {
    id: 'swiss-red',
    tags: 'swiss, design, modern, architecture, exhibition',
    bg: '#F5F5F0',
    surface: '#FFFFFF',
    ink: '#111111',
    muted: '#666666',
    accent: '#E4251B',
    onAccent: '#FFFFFF',
  },
  {
    id: 'sunny-pop',
    tags: 'fun, summer, kids, playful, sale',
    bg: '#FFE45E',
    surface: '#FFF3B0',
    ink: '#1B1B1B',
    muted: '#5A5130',
    accent: '#FF5A36',
    onAccent: '#FFFFFF',
  },
  {
    id: 'peach-cream',
    tags: 'warm, food, lifestyle, soft, bakery',
    bg: '#FCE8DC',
    surface: '#FFF6F0',
    ink: '#3B1F1A',
    muted: '#8C6A5E',
    accent: '#E2725B',
    onAccent: '#FFFFFF',
  },
  {
    id: 'sage-calm',
    tags: 'wellness, spa, health, yoga, botanical',
    bg: '#E7EDE4',
    surface: '#F6F8F4',
    ink: '#1F2A22',
    muted: '#66756A',
    accent: '#5E7D63',
    onAccent: '#FFFFFF',
  },
  {
    id: 'sky-fresh',
    tags: 'tech, startup, app, clean, product',
    bg: '#E8F1FF',
    surface: '#FFFFFF',
    ink: '#0B1B3A',
    muted: '#5A6B8C',
    accent: '#2F6BFF',
    onAccent: '#FFFFFF',
  },
  {
    id: 'lilac-dream',
    tags: 'creative, beauty, soft, dreamy, feminine',
    bg: '#EFE7FF',
    surface: '#FAF7FF',
    ink: '#24123F',
    muted: '#6F5E8C',
    accent: '#8B5CF6',
    onAccent: '#FFFFFF',
  },
  {
    id: 'terracotta',
    tags: 'earthy, craft, coffee, boho, artisan',
    bg: '#F2E6D8',
    surface: '#FBF5EE',
    ink: '#2E1E14',
    muted: '#7E6A58',
    accent: '#C4572E',
    onAccent: '#FFFFFF',
  },
  {
    id: 'mint-fresh',
    tags: 'eco, fresh, health, juice, spring',
    bg: '#DFF7EC',
    surface: '#F3FCF8',
    ink: '#0F2E22',
    muted: '#4E7262',
    accent: '#0E9F6E',
    onAccent: '#FFFFFF',
  },
  {
    id: 'blush-luxe',
    tags: 'wedding, luxury, beauty, invitation, bridal',
    bg: '#F6E9E4',
    surface: '#FCF6F3',
    ink: '#2B2B2B',
    muted: '#7A6E69',
    accent: '#B08D57',
    onAccent: '#FFFFFF',
  },
  // Vivid
  {
    id: 'tomato-pop',
    tags: 'loud, sale, food, energy, street',
    bg: '#FF4D2E',
    surface: '#FF6B4F',
    ink: '#FFF4E8',
    muted: '#FFD3C4',
    accent: '#1C1C1C',
    onAccent: '#FFF4E8',
  },
  {
    id: 'cobalt-bold',
    tags: 'bold, sport, announcement, tech, launch',
    bg: '#1F3BFF',
    surface: '#3550FF',
    ink: '#FFFFFF',
    muted: '#C9D0FF',
    accent: '#FFE14D',
    onAccent: '#111111',
  },
  {
    id: 'emerald-bold',
    tags: 'finance, eco, confident, growth, festival',
    bg: '#0B6E4F',
    surface: '#0F8560',
    ink: '#F7F3E8',
    muted: '#BFD8CB',
    accent: '#F7C548',
    onAccent: '#0B2E22',
  },
  {
    id: 'hot-pink',
    tags: 'party, fashion, pop, nightlife, youth',
    bg: '#FF3EA5',
    surface: '#FF62B5',
    ink: '#1A0010',
    muted: '#5C1A3D',
    accent: '#1A0010',
    onAccent: '#FF3EA5',
  },
]

const display = (
  family: string,
  weight: number,
  tracking: number,
  lineHeight: number,
  upper = false,
): TypeStyle => ({ family, weight, tracking, lineHeight, upper })

export const FONT_PAIRS: FontPair[] = [
  {
    id: 'bebas-inter',
    tags: 'bold, condensed, event, sport, poster',
    display: display('Bebas Neue', 400, 0.01, 0.92, true),
    body: { family: 'Inter' },
  },
  {
    id: 'anton-inter',
    tags: 'loud, sale, impact, headline, street',
    display: display('Anton', 400, 0, 1.02, true),
    body: { family: 'Inter' },
  },
  {
    id: 'archivo-black',
    tags: 'modern, heavy, brand, confident',
    display: display('Archivo Black', 400, -0.02, 1.0),
    body: { family: 'Archivo' },
  },
  {
    id: 'playfair-source',
    tags: 'elegant, editorial, luxury, classic',
    display: display('Playfair Display', 700, -0.01, 1.05),
    body: { family: 'Source Sans 3' },
  },
  {
    id: 'dmserif-dmsans',
    tags: 'editorial, warm, food, magazine',
    display: display('DM Serif Display', 400, -0.01, 1.05),
    body: { family: 'DM Sans' },
  },
  {
    id: 'fraunces-inter',
    tags: 'quirky, craft, soft serif, bakery, books',
    display: display('Fraunces', 700, -0.02, 1.02),
    body: { family: 'Inter' },
  },
  {
    id: 'cormorant-montserrat',
    tags: 'luxury, wedding, refined, fashion',
    display: display('Cormorant Garamond', 600, 0, 1.0),
    body: { family: 'Montserrat' },
  },
  {
    id: 'spacegrotesk-inter',
    tags: 'tech, startup, product, futuristic',
    display: display('Space Grotesk', 700, -0.03, 1.0),
    body: { family: 'Inter' },
  },
  {
    id: 'syne-inter',
    tags: 'creative, art, agency, experimental',
    display: display('Syne', 800, -0.02, 0.98),
    body: { family: 'Inter' },
  },
  {
    id: 'oswald-lato',
    tags: 'news, sport, strong, industrial',
    display: display('Oswald', 600, 0, 1.05, true),
    body: { family: 'Lato' },
  },
  {
    id: 'poppins',
    tags: 'friendly, social, app, approachable',
    display: display('Poppins', 800, -0.02, 1.05),
    body: { family: 'Poppins' },
  },
  {
    id: 'abril-lato',
    tags: 'retro, magazine, fashion, dramatic',
    display: display('Abril Fatface', 400, 0, 1.02),
    body: { family: 'Lato' },
  },
  {
    id: 'unbounded-inter',
    tags: 'playful, wide, music, festival, youth',
    display: display('Unbounded', 800, -0.02, 1.05),
    body: { family: 'Inter' },
  },
  {
    id: 'instrument-inter',
    tags: 'minimal, modern editorial, calm, studio',
    display: display('Instrument Serif', 400, -0.01, 1.0),
    body: { family: 'Inter' },
  },
]

export const paletteById = (id: string) => PALETTES.find(p => p.id === id)
export const fontPairById = (id: string) => FONT_PAIRS.find(f => f.id === id)
