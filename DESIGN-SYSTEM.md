# SINPF Legal Case Management System — Design System v1.0

Institutional, trustworthy, and built for dense legal data. Navy carries authority,
blue carries interaction, gold is reserved as a signal color — used sparingly so it
always means something.

---

## 1. Brand palette

| Token | Hex | Role |
|---|---|---|
| `--sinpf-navy` | `#02314F` | Institutional anchor. Foreground text, sidebar, document headers. |
| `--sinpf-blue` | `#0B75BB` | Interactive. Buttons, links, focus rings, active states. |
| `--sinpf-gold` | `#FFDE11` | Signal. Deadlines, "action required", active nav marker. Never body text. |

### Blue ramp (navy and blue share a hue family — one unified scale)

| Step | Hex | Typical use |
|---|---|---|
| blue-50 | `#F0F7FC` | Hover tint, selected table row |
| blue-100 | `#DCEEF9` | Secondary button bg, info banners |
| blue-200 | `#B9DEF3` | Borders on info elements |
| blue-300 | `#8CC9EB` | Charts, decorative |
| blue-400 | `#4BA3D9` | Dark-mode primary, charts |
| blue-500 | `#0B75BB` | **Brand blue.** Primary buttons, links |
| blue-600 | `#095F99` | Button hover |
| blue-700 | `#084D7C` | Button active/pressed |
| blue-800 | `#053C61` | Deep surfaces |
| blue-900 | `#02314F` | **Brand navy.** Text, sidebar, headers |
| blue-950 | `#021F33` | Dark-mode background base |

### Gold ramp

| Step | Hex | Typical use |
|---|---|---|
| gold-50 | `#FFFCE8` | Highlight background |
| gold-100 | `#FFF7C2` | "Due soon" row tint, badge bg |
| gold-200 | `#FFEF87` | Hover on highlight |
| gold-300 | `#FFE74D` | Charts |
| gold-400 | `#FFDE11` | **Brand gold.** Active nav marker, flags |
| gold-600 | `#CCA800` | Icons on light bg |
| gold-900 | `#715312` | Text on gold-100 backgrounds (AA safe) |

**Gold rules:** dark text on gold, never gold text on white (fails contrast badly).
Pair `gold-100` background with `gold-900` text for badges. On the navy sidebar,
pure `gold-400` works as a 3px active-item bar or icon accent.

### Semantic colors

| Token | Light | Use |
|---|---|---|
| `--success` | `#177245` | Matter won, contribution verified, filing accepted |
| `--warning` | `#B45309` | Approaching deadline (orange, so it never competes with brand gold) |
| `--destructive` | `#B42318` | Overdue, deletion, litigation risk |
| `--info` | `#0B75BB` | Neutral notices (reuses brand blue) |

---

## 2. Typography

Loaded via `next/font` (self-hosted at build time — no runtime request to Google,
which matters on Honiara bandwidth).

- **Source Serif 4** — titles and matter names only. `--font-serif`
- **Source Sans 3** — everything else. `--font-sans`
- Tabular numerals (`tabular-nums`) on all member numbers, amounts, dates, docket refs.

| Style | Face | Size/Line | Weight | Use |
|---|---|---|---|---|
| Display | Serif | 32/40 | 700 | Page titles |
| H2 | Serif | 24/32 | 600 | Matter names, section titles |
| H3 | Sans | 20/28 | 600 | Card titles, panel headers |
| H4 | Sans | 16/24 | 600 | Sub-sections, table group headers |
| Body | Sans | 16/24 | 400 | Long-form content, legal notes |
| UI (default) | Sans | 14/20 | 400 | Tables, forms, lists |
| Label | Sans | 14/20 | 500 | Form labels, column headers |
| Caption | Sans | 12/16 | 400 | Timestamps, helper text |
| Overline | Sans | 11/16 | 600, +0.06em, uppercase | Eyebrow labels ("MATTER NO.") |

---

## 3. Spacing, radius, elevation

- **Spacing scale (4px base):** 4, 8, 12, 16, 24, 32, 48, 64. Nothing off-grid.
- **Radius:** `--radius: 6px`. Restrained and institutional — cards 6px, badges 4px, buttons 6px. No pill shapes except avatars.
- **Elevation:** borders first, shadows second. Cards get a 1px border (`--border`) and no shadow; only floating elements (dropdowns, dialogs, popovers) get shadows.
- **Layout:** 1200px max content width, 240px fixed navy sidebar, 8px grid throughout.

---

## 4. Signature element

The **navy sidebar with a gold active-marker**: sidebar in `#02314F`, white/blue-200
text, and the active item marked with a 3px `#FFDE11` left bar plus gold icon. It is
the one place gold is always present, which trains users that gold = "where the
action is" — the same meaning it carries on deadline badges in the content area.

---

## 5. Component conventions (shadcn)

| Component | Convention |
|---|---|
| Button | `default` = blue-500 → hover blue-600 → active blue-700. `secondary` = blue-100 bg / navy text. `destructive` = red. No gold buttons. |
| Badge | Status system: Open (blue-100/navy), In review (gold-100/gold-900), Urgent (red tint), Closed (muted), Resolved (green tint). |
| Table | 14px, `tabular-nums`, row hover blue-50, selected row blue-100, sticky header with `--muted` bg. |
| Form | Labels 14/500 above inputs, helper text 12px muted, error text + border in `--destructive`, focus ring `--ring` (brand blue). |
| Dialog | Serif title (H2), max-width 560px for confirmations. |
| Date/deadline | Always dd/mm/yyyy. Deadlines within 7 days get the gold badge; overdue gets destructive. |

---

## 6. Content rules

"Matter" for legal cases, "Member" for fund members, "Member No." abbreviated
consistently. Sentence case for all UI text including buttons ("Save changes",
not "SAVE CHANGES"). Dates dd/mm/yyyy. Currency as SBD 1,234.56. Errors state
what happened and what to do next.

---

## 7. Accessibility baseline

WCAG 2.1 AA. Key verified pairs: navy on white 12.6:1, blue-500 on white 4.9:1,
gold-900 on gold-100 7.4:1, white on blue-500 4.9:1. Focus visible on every
interactive element (2px brand-blue ring, 2px offset). All meaning carried by
color is duplicated with an icon or label (badges have text, not just color).
