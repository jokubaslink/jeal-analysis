# JEAL visual design system

This document defines the shared visual language for the JEAL web app so screens stay consistent. Implementation tokens live in **`frontend/src/styles/design-tokens.css`** as CSS custom properties (`var(--…)`).

A **live reference page** with swatches and examples: with the Vite dev server running (`npm run dev` in `frontend`), open **http://localhost:5173/style-guide.html**. The file lives at **`frontend/public/style-guide.html`** (also included in production builds under `/style-guide.html`).

---

## Color palette

| Token / usage | Hex / value | Notes |
|---------------|-------------|--------|
| **Ink** `--color-ink` | `#111827` | Primary text, primary buttons |
| **Ink muted** `--color-ink-muted` | `#4b5563` | Secondary body, subtitles |
| **Ink subtle** `--color-ink-subtle` | `#6b7280` | Footer, hints, disabled feel |
| **Surface** `--color-surface` | `#ffffff` | Cards, header wash, inputs |
| **Brand lime** `--color-brand-lime` | `#bef264` | Accent; use in gradients and highlights |
| **Brand lime soft** | `rgba(190, 242, 100, 0.22)` | Page glows, radial accents |
| **Brand green** `--color-brand-green` | `#3f6212` | Eyebrow labels, admin emphasis |
| **Border** `--color-border` | `rgba(17, 24, 39, 0.08)` | Dividers, card borders |
| **Border medium** | `rgba(17, 24, 39, 0.12)` | Active nav pill border |
| **Border strong** | `rgba(17, 24, 39, 0.14)` | Logout / secondary outlines |
| **Border input** `--color-border-input` | `#d1d5db` | Text fields |
| **Page background** | Gradient | Top `#f8fafc` → mint `#f0fdf4` (see `Layout` / `index.css`) |
| **Success text / bg / border** | `#166534` / `#f0fdf4` / `#bbf7d0` | Inline success banners |
| **Error text / bg / border** | `#b91c1c` / `#fef2f2` / `#fecaca` | Validation and API errors |

**Usage:** Prefer tokens in new global CSS. Existing React inline styles may still use raw hex; migrate when touching a file.

---

## Typography

| Role | Tokens | Rules |
|------|--------|--------|
| **Font stack** | `--font-family-base` | `"Trebuchet MS", "Segoe UI", system-ui, sans-serif` |
| **Display / hero** | `--font-size-display` | ~28–32px, `--font-weight-bold`, `--line-height-tight` |
| **H1 (marketing)** | `--font-size-h1` | 30px (global `h1` in `index.css` may use `em`) |
| **H2 / screen title** | `--font-size-h2`, `--font-weight-bold` | 22px — admin cards, form headers |
| **H3** | `--font-size-h3`, `--font-weight-bold` | Section subheads |
| **Body** | `--font-size-body`, `--line-height-body` | 14px default UI copy |
| **Small / labels** | `--font-size-small`, `--font-weight-bold` | 13px form labels |
| **Caption / hint** | `--font-size-caption`, `--color-ink-subtle` | Helper text under fields |
| **Eyebrow** | `--font-size-xs` or caption + `--letter-spacing-wide`, **uppercase**, `--color-brand-green` | “Administration”, “Welcome back” |

**Weights:** `--font-weight-medium` (500) for links; `--font-weight-semibold` (600) for nav and secondary buttons; `--font-weight-bold` (700) for labels and primary actions.

---

## Spacing system

Base unit **4px**. Use the scale for padding, gap, and margin.

| Token | Value | Typical use |
|-------|-------|-------------|
| `--space-1` | 4px | Tight gaps |
| `--space-2` | 6px | Nav stack gap |
| `--space-3` | 8px | Inline padding |
| `--space-4` | 10px | Nav link gap |
| `--space-5` | 12px | Field vertical rhythm, input padding (y) |
| `--space-6` | 14px | Input padding (x), form gaps |
| `--space-7` | 16px | Section padding, footer |
| `--space-8` | 18px | Sidebar padding |
| `--space-9` | 20px | Card padding variant |
| `--space-10` | 22px | Card / form top spacing |
| `--space-11` | 24px | Card padding (admin) |
| `--space-12` | 28px | Layout grid gap |
| `--space-13` | 32px | Large section spacing |
| `--space-14` | 40px | Main content horizontal padding, max-width gutters |

**Layout:** Content max width **`--layout-max-width`** = `1200px`, centered.

---

## Radius

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | 8px | Generic `button` default (global) |
| `--radius-md` | 10px | Alert banners |
| `--radius-input` | 12px | Text inputs, textareas, selects |
| `--radius-lg` | 20px | Cards, modals, admin panels |
| `--radius-xl` | 24px | Large auth cards |
| `--radius-pill` | 999px | Primary CTA, nav pills, chips |

---

## Shadows

| Token | Value |
|-------|--------|
| `--shadow-card` | `0 18px 40px rgba(15, 23, 42, 0.06)` |
| `--shadow-card-strong` | `0 24px 60px rgba(15, 23, 42, 0.1)` |

Use on elevated surfaces (cards, auth panel).

---

## Buttons

### Primary

- Background: `--color-ink`
- Text: `--color-surface`
- Padding: `12px 16px`–`12px 20px`
- Radius: `--radius-pill`
- Font: `--font-size-body`, `--font-weight-bold`
- Hover: slight opacity or `translateY(-1px)` (global button style)

### Secondary / outline

- Background: `--color-surface`
- Border: `1px solid` `--color-border-strong`
- Text: `--color-ink`
- Same radius pill and weight as primary where used in header

### Nav pill (active)

- Background: `rgba(17, 24, 39, 0.08)`
- Border: `1px solid rgba(17, 24, 39, 0.12)`
- Padding: `8px 14px`
- Radius: `--radius-pill`

---

## Inputs

- Padding: `12px 14px`
- Border: `1px solid var(--color-border-input)`
- Radius: `--radius-input`
- Font: `--font-size-body`, `--font-family-base`
- Background: `rgba(255, 255, 255, 0.92)` or solid `--color-surface`

**Textarea:** same as input; `min-height` ~100px where multi-line.

**Focus:** preserve visible focus ring (global `button:focus-visible` pattern); inputs should use `:focus-visible` outline consistent with WCAG.

---

## Cards (content panels)

- Background: `--color-surface`
- Border: `1px solid var(--color-border)`
- Radius: `--radius-lg`
- Shadow: `--shadow-card`
- Inner padding: `--space-11` (24px) typical

---

## Motion

- `--duration-fast`: `0.15s` for hovers (nav, borders)
- Easing: `ease` for UI chrome

---

## Keeping docs in sync

1. Edit **`frontend/src/styles/design-tokens.css`** when adding or changing tokens.
2. Update **`frontend/public/style-guide.html`** if you change token names or key component recipes (it inlines the same `:root` block; served at `/style-guide.html` by Vite).
3. Summarize semantic changes in this file (`DESIGN_SYSTEM.md`).

---

## Related files

| File | Role |
|------|------|
| `frontend/src/styles/design-tokens.css` | CSS variables (imported from `main.jsx`) |
| `frontend/src/index.css` | Global base styles using tokens where wired |
| `frontend/src/components/Layout.jsx` | Header, nav, page shell |
| `frontend/public/style-guide.html` | Visual gallery (URL: `/style-guide.html`) |
