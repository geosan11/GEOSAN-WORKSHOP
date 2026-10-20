# GEOSAN Design System — Futur × Ops

Visual language drawn from [The Futur](https://thefutur.com/) (editorial cream, black type, yellow CTA) and tuned for GEOSAN Workshop density.

## Principles

1. **One idea per region** — orient, then act. No decorative chrome.
2. **Type does the hierarchy** — display weight + size beats color noise.
3. **Yellow is the verb** — primary actions are gold/yellow; black is secondary structure.
4. **Cream is the stage** — warm off-white canvas; ink for reading; cards barely lift.
5. **Geometric, not soft SaaS** — tight radii, stamps, hairlines.

## Color

| Token | Light (default) | Role |
|---|---|---|
| `--bg-app` | `#F3EEE6` | Page canvas (Futur cream) |
| `--bg-card` | `#FFFCF7` | Panels / cards |
| `--bg-card-elevated` | `#FFFFFF` | Hover / elevated |
| `--text-main` | `#111111` | Headlines & body |
| `--text-muted` | `#6B6560` | Meta / helpers |
| `--color-primary` | `#F0B230` | GEOSAN gold CTA |
| `--color-primary-hover` | `#FFBD59` | CTA hover |
| `--color-on-primary` | `#111111` | Text on gold |
| `--color-ink` | `#111111` | Black structural CTA |
| `--color-on-ink` | `#FFFCF7` | Text on black |
| `--border-app` | `rgba(17,17,17,0.1)` | Hairlines |

Dark mode (`.dark`) keeps the prior obsidian operator shell as an alternate.

## Type

| Style | Spec |
|---|---|
| Display / page | Outfit 800, 1.75–2.5rem, tracking `-0.035em` |
| Section | Outfit 700, uppercase, 0.8125rem |
| Body | Inter 400/500, 0.8125–0.875rem, leading 1.55 |
| Meta / stamp | JetBrains Mono, 0.625rem, tracking `0.12em`, uppercase |

## Radius

| Token | Value | Use |
|---|---|---|
| `--radius-stamp` | `2px` | Status stamps |
| `--radius-control` | `4px` | Inputs, dense buttons |
| `--radius-card` | `6px` | Panels |
| `--radius-pill` | `999px` | Marketing / nav CTAs |

## Components

### Buttons
- `.btn.btn-primary` — gold fill, black label (Futur “Buy Now”)
- `.btn.btn-ink` — black fill, cream label (Futur “Log in”)
- `.btn.btn-ghost` — hairline border, ink label (Futur “Start free”)
- `.btn.btn-pill` — adds pill radius for marketing-weight actions

### Fields
- `.field` — cream inset, ink text, gold focus ring

### Stamps
- `.stamp` / `.stamp-primary` / `-success` / `-warn` / `-danger` — geometric status marks

### Layout chrome
- `.section-card` + `.section-card-accent` — flat card + gold hairline
- `.kpi-tile` — orientation number tiles
- `.rule-gold` — Futur-style accent rule under page titles

## Density

| Mode | Use |
|---|---|
| Editorial | Login, empty states, marketing moments — more air |
| Operator | Inbox, tables, Runs — compact rows, stamps, mono meta |

## Do / Don’t

**Do:** black type on cream, gold for the one next action, stamps for status, Outfit for titles.  
**Don’t:** soft emerald glow as brand, giant soft shadows, candy pills, cyan “SaaS starter” accents as primary.
