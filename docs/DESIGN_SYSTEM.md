# Design system

Tokens are defined in `app/globals.css` (`@theme`). Sampled from the official site **https://www.dipperfox.com** on 2026-11-12 (page HTML and `web.assets_frontend.min.css`).

## Colours

| Token | Hex | Where it comes from | Use |
|---|---|---|---|
| `navy` | `#000061` | Most frequent inline brand colour on dipperfox.com (headings, buttons) | Top bar, headings, primary navy buttons |
| `navy-deep` | `#030336` | Dark sections on dipperfox.com | Landing hero |
| `navy-600` | `#000072` | Site hover variant | Hover |
| `navy-mist` | `#8D92BA` | Muted text on dark sections | Secondary text on navy |
| `orange` | `#FF812C` | Logo fill (SVG) and site accents | Primary CTA, focus ring, “best candidate” |
| `ink` | `#1E1E1E` | Site body text | Body text |
| `slate` | `#3B3C46` | Site secondary text | Secondary text |
| `surface` | `#F7F7F7` | Site light backgrounds | Page background |
| `ice` | `#EBF3F5` | Site light accent sections | Info boxes, image backgrounds |

Status colours are app-specific and always paired with an icon **and** words. Preliminary results use blue (“within published range”), grey (“outside”) and amber (“can’t compare”) — **never green or red**, because draft data cannot establish a final decision. Green/red are reserved for strict results based on approved rules.

## Typography

Inter (the site uses Inter via Google Fonts; loaded with `next/font`).

## Assets (official, authorised by Dipperfox per project decision)

| File | Source |
|---|---|
| `public/brand/dipperfox-logo.svg` | `https://www.dipperfox.com/web/image/website/1/logo/Dipperfox` (orange SVG, used on navy) |
| `public/brand/sc400.webp` | `https://www.dipperfox.com/web/image/2127-d3b029a3/sc400.webp` |
| `public/brand/sc600.webp` | `https://www.dipperfox.com/web/image/2126-b4a67e4f/sc600.webp` |
| `public/brand/sc850pro.webp` | `https://www.dipperfox.com/web/image/2128-aa805e19/sc850pro2.webp` |

Product photos are 390×360 web images. **Asset gap:** request high-resolution originals and an official logo usage guide from Dipperfox.

## Layout

- Desktop (≥1024 px): two panels, left ≈44 % (guided input) and right ≈56 % (live comparison).
- Mobile/tablet: stacked with a sticky “Your machine / Comparison” tab switch.
- Accessibility: visible orange focus ring, labelled inputs, radio groups for choices, `aria-live` research status, reduced-motion support, WCAG AA contrast for text tokens on white.
