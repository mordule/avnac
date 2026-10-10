import { z } from 'zod'

const clip = (max: number) =>
  z.preprocess(
    v => (typeof v === 'string' ? v.trim().slice(0, max) : v === null ? undefined : v),
    z.string().optional(),
  )

export const designBriefSchema = z.object({
  format: z.preprocess(v => (typeof v === 'string' ? v.slice(0, 40) : 'design'), z.string()),
  kicker: clip(40),
  headline: z.preprocess(
    v => (typeof v === 'string' ? v.trim().slice(0, 90) : v),
    z.string().min(1),
  ),
  subhead: clip(140),
  body: clip(280),
  details: z.preprocess(
    v =>
      Array.isArray(v)
        ? v
            .filter(x => typeof x === 'string' && x.trim())
            .map(x => x.trim().slice(0, 48))
            .slice(0, 4)
        : [],
    z.array(z.string()),
  ),
  cta: clip(28),
  imageQuery: z.preprocess(
    v => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 80) : null),
    z.string().nullable(),
  ),
  layouts: z.array(z.string().max(60)).max(12).default([]),
  palettes: z.array(z.string().max(60)).max(12).default([]),
  fonts: z.array(z.string().max(60)).max(12).default([]),
})

export type DesignBrief = z.infer<typeof designBriefSchema>

export type DesignCatalog = {
  layouts: { id: string; description: string; needsImage: boolean }[]
  palettes: { id: string; tags: string }[]
  fonts: { id: string; tags: string }[]
}

export function briefSystemPrompt(catalog: DesignCatalog, imagesEnabled: boolean): string {
  const layouts = catalog.layouts
    .filter(l => imagesEnabled || !l.needsImage)
    .map(l => `- ${l.id}: ${l.description}`)
    .join('\n')
  const palettes = catalog.palettes.map(p => `- ${p.id}: ${p.tags}`).join('\n')
  const fonts = catalog.fonts.map(f => `- ${f.id}: ${f.tags}`).join('\n')
  return `You are a senior art director and copywriter. A layout engine will turn your brief into finished designs; you decide the words and the direction, not coordinates.

Return ONLY one JSON object, no prose, no code fences:
{
  "format": string,          // what this is: "poster", "instagram post", "flyer", "slide", "invitation", "ad", "thumbnail", "menu", "card", ...
  "kicker": string,          // tiny label above the headline, <= 4 words (e.g. "Live Music", "Limited Offer"). Optional.
  "headline": string,        // the hero line, punchy, ideally 2-6 words, never more than 9
  "subhead": string,         // one supporting line, <= 14 words. Optional.
  "body": string,            // only if the format needs a short paragraph, <= 30 words. Optional.
  "details": string[],       // 0-4 short facts: date, time, venue, price, url/handle. Each <= 5 words.
  "cta": string,             // call to action, <= 3 words (e.g. "Get tickets"). Optional.
  "imageQuery": string|null, // ${imagesEnabled ? '2-4 concrete stock-photo keywords if a photo would elevate the design, else null' : 'always null'}
  "layouts": string[],       // 4-6 layout ids, best first, chosen for this format and content
  "palettes": string[],      // 6 palette ids, best first; top 4 should be distinct directions that all fit the brief
  "fonts": string[]          // 6 font pair ids, best first; top 4 should differ in character
}

Copy rules:
- Use every fact the user gives, verbatim (names, dates, prices). Do not invent prices or exact dates the user did not give; prefer omitting a detail over faking it.
- Lead with the strongest hook. An offer, number or name is hero material: put "20% off" style hooks in the headline or kicker, never only in details.
- The headline must be evocative, not a label. Bad: "Kora Grand Opening". Good: "Lekki, meet Kora." / "Jollof, reimagined."
- Sentence case (capitalize only the first word and proper nouns). Never Title Case Every Word.
- Each fact appears once. Do not repeat the headline in the subhead or details.
- Write like a top agency copywriter: specific, sensory, confident. No clichés ("Unleash", "Elevate", "Experience the magic", "Join us for an unforgettable"). No emojis. No lorem ipsum.
- Match the user's language. Few words; great design breathes.

Example (for "Instagram post for Kora, West African fusion restaurant opening in Lekki, Sat 12 Oct, 20% off first week"):
{"format":"instagram post","kicker":"Now open · 20% off","headline":"Lekki, meet Kora.","subhead":"West African classics, cooked with a modern accent.","details":["Opens Sat 12 Oct","20% off all week","Lekki, Lagos"],"cta":"Book a table","imageQuery":"west african food plating","layouts":["photo-overlay","statement","color-block","editorial"],"palettes":["terracotta","emerald-bold","midnight-gold","peach-cream","tomato-pop","forest"],"fonts":["dmserif-dmsans","fraunces-inter","archivo-black","playfair-source","bebas-inter","syne-inter"]}

Direction rules:
- Pick palettes and fonts whose tags match the mood, industry and audience.
- Vary the top 4 picks so the user sees genuinely different directions.
- Prefer photo layouts when imagery matters (food, travel, product, people, places).

Layouts:
${layouts}

Palettes:
${palettes}

Font pairs:
${fonts}`
}
