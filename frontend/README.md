# SharpLink homepage — Next.js conversion

A faithful reconstruction of `https://www.sharplink.com/` (its home route) as a
Next.js 15 App Router app, built from the scraped page in `../page_content (1)`.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm run start
```

## How it was built

The source scrape is a **Nuxt 3 (Vue) server render** with Vue *scoped* styles
(`data-v-…` attributes) and a heavy GSAP + Lenis scroll layer. Only one of ~25 JS
chunks and almost no binary assets were in the scrape, so:

| Piece | Approach |
|---|---|
| **Markup** | `scripts/convert.py` turns the scraped `index.html` into React components under `components/generated/`. It keeps every `data-v-…` attribute, restores camelCase SVG tags/attrs that `html.parser` lowercased, strips GSAP runtime junk (inline transforms/opacity/clip-path, `pin-spacer` wrappers), collapses SplitText per-character `<div>` soup back to text, and rewrites asset URLs to `/…` paths. |
| **CSS** | `scripts/build_css.py` concatenates the original 27 stylesheets **verbatim** (in `<head>` order) into `styles/site.css` and repoints `../_fonts` / `../images` / `../svgs` at `/public`. Because the markup keeps its scoping attributes, the original CSS matches without a rewrite. `app/globals.css` holds only the deltas listed below. |
| **Fonts** | Archivo + Archivo Narrow woff2/woff, downloaded to `public/_fonts`, served by the original `@font-face` rules. |
| **Assets** | `scripts/fetch_assets.sh` pulls ~35 images / 3 videos / the Lottie / icon SVGs from `a.storyblok.com` and `sharplink.com` into `public/`. |
| **Behaviour** | `components/SiteScripts.tsx` (one client component) reconstructs: Lenis smooth scroll wired to GSAP ScrollTrigger, per-letter text reveals, entrance fades, parallax, header light/dark theme by section, the FAQ accordion, mobile menu, cookie banner + `--cookie-offset`, background-video autoplay, the Propositions Lottie (`lottie-web`), and the opportunity fixed-video show/hide. |

Regenerate after editing the scrape or the converter:

```bash
python scripts/convert.py      # needs: pip install beautifulsoup4
python scripts/build_css.py
bash   scripts/fetch_assets.sh
```

## Runtime-only pieces that were substituted

Three things were drawn by code that wasn't in the scrape and are replaced with
static equivalents (see the marked spots in `convert.py` / `globals.css`):

- **Productivity chart** — Chart.js `<canvas>` → the CMS chart image `chart-img.webp`.
- **Propositions "stack"** — rendered from `shrp_stack.json` with `lottie-web`.
- **Footer word­mark** — a three.js/WebGPU `<canvas>` → a CSS gradient-text "Sharplink".

## Known deviations from the live site

- **Hero → productivity morph.** The live site pins `.home-productivity` and
  scrubs the full-screen hero down into the chart card (clip-path + scale) while
  the chart heading/image/CTA fade in. That timeline was in an un-scraped JS
  chunk and was unstable to rebuild on top of Lenis + ScrollTrigger, so the hero
  is a normal full-height section and the productivity section is a normal
  stacked block with its chart card shown. See `MORPH-NOTES` in `SiteScripts.tsx`.
- Scroll-choreography **timings are approximated** throughout (pin lengths, the
  opportunity video in/out points, proposition item highlighting).
- The `shrp_stack_outline` wireframe behind the banner logo and the tiny
  `.has-pin` corner dots render but aren't animated.
- The opportunity alpha video is VP9-in-WebM (Chrome/Firefox); the Safari HEVC
  fallback `.mp4` is included but Chromium can't decode it.
- Nav links are plain `<a>` (full navigation) — the other routes aren't built.
