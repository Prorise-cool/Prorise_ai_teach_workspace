# XiaoMai Classroom Result Page - UI Design Audit

**File:** `01-classroom.html`  
**Purpose:** Classroom lesson/scene result page mockup for OpenMAIC learning feature port  
**Status:** Static HTML reference using Tailwind CSS + Lucide Icons  
**Audit Date:** 2026-04-23  

---

## 1. OVERALL LAYOUT STRUCTURE

### Grid Architecture
The page uses a **three-column layout** with sidebar collapse capability:

```
┌─────────────────────────────────────────────────────────┐
│                  Header (h-16)                          │
├──────┬──────────────────────────────────┬──────────────┤
│      │                                  │              │
│ Left │         Main Content Area        │   Right      │
│Sidebar (flex-col with │       (flex-1 centered)       │Sidebar │
│(260px) │    (aspect-video, max-h-full)   │  (300px)   │
│        │                                  │              │
├──────┼──────────────────────────────────┼──────────────┤
│                 Footer (shrink-0)                        │
└──────┴──────────────────────────────────┴──────────────┘
```

**Key Details:**
- **Left Sidebar (Outline):** Fixed `260px` width, scrollable, contains lesson/scene thumbnails numbered 1-2
- **Header:** Sticky height `h-16` (64px), spans full width, contains title + action buttons
- **Main Content:** `flex-1` with `min-h-0` to enable vertical overflow control, centers aspect-video card (16:9)
- **Right Sidebar (Companion/Assistant):** Fixed `300px` (XL: `340px`), toggleable, contains tabs (Notes / Q&A)
- **Footer:** `shrink-0`, full-width, contains next-steps callout + teacher bubble + playback controls

**Responsive Breakpoints:**
- `md:` (768px+): Sidebars become relative (not fixed), no mobile overlay
- `lg:` (1024px+): Additional layout tweaks (wider gaps, visible labels)
- `xl:` (1280px+): Companion sidebar expands to 340px

**Mobile Behavior:**
- Sidebars are **fixed + off-screen** by default (`-translate-x-full` left, `translate-x-full` right)
- Single tap toggles sidebar, shows semi-transparent overlay (`opacity-0 invisible` → animated in)
- Main content stays centered, unaffected by sidebar presence

---

## 2. VISUAL STYLE & DESIGN TOKENS

### Color Palette (Hex Values)

#### Primary Brand Colors
| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `brand` | `#f5c547` (warm gold) | `#e6b841` (darker gold) | Accent, highlights, CTAs, progress |
| `secondary` | `#f5ede1` (cream) | `#2a2420` (charcoal) | Alternative background, hover states |
| `decorative` | `#3b1701` (dark brown) | (not used in dark) | Logo icon fill in light mode |

#### Background & Surface
| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `bg.light` | `#f5ede1` | N/A | Page background |
| `bg.dark` | N/A | `#110e0d` (near-black) | Page background |
| `surface.light` | `#ffffff` (white) | N/A | Cards, containers |
| `surface.dark` | N/A | `#1f1a18` (very dark brown) | Cards, containers |

#### Text Colors
| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `text.primary` | `#3b1701` (dark brown) | `#f5ede1` (cream) | Headings, body text |
| `text.secondary` | `#6b4421` (warm brown) | `#a89f91` (warm gray) | Disabled, hints, metadata |

#### Border & Divider
| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `bordercolor.light` | `#e6dcc8` (light tan) | N/A | All borders, dividers |
| `bordercolor.dark` | N/A | `#302824` (dark brown-gray) | All borders, dividers |

#### Agent Personality Colors (for avatars/badges)
- `agent.efficient`: `#6D5DF4` (violet)
- `agent.humorous`: `#FFB020` (orange)
- `agent.patient`: `#00C48C` (teal/green)
- `agent.serious`: `#0091FF` (blue) — **used for "Teacher" badge**

#### Status/Semantic
- `success`: `#52c41a` (light) / `#51d712` (dark) — checkmarks, success states
- `warning`: `#ff6700` (light) / `#f34700` (dark) — alerts
- `error`: `#f82834` (light) / `#bf0004` (dark) — errors

### Typography

**Font Stack:** `Inter, Noto Sans SC, sans-serif` (weights: 400, 500, 600, 700, 800)  
**Monospace Stack:** `JetBrains Mono, ui-monospace, monospace` (for code, formulas)

#### Text Styles Used

| Element | Size | Weight | Line Height | Usage |
|---------|------|--------|-------------|-------|
| H1 (Page Title) | `text-sm` → `text-base` (md:) | `font-bold` (700) | — | Main heading (e.g., "微分与导数基础应用") |
| H2 (Card Title) | `text-xl` → `text-2xl` (md:) | `font-bold` (700) | — | Scene title (e.g., "理解链式法则") |
| Label / Caps | `text-[10px]` | `font-bold` (700) | — | "SCENE 02", "课程大纲", uppercase |
| Body | `text-[13px]` → `text-sm` | `400–500` | `leading-relaxed` (1.625) | Main prose, explanations |
| Small Text | `text-xs` → `text-[12px]` | `500–600` | — | Metadata, labels, buttons |
| Monospace (Formula) | `text-[13px]` → `text-sm` | `500–700` (bold emphasis) | `whitespace-pre-wrap` | Code/math blocks |

**Selection Color:** `selection:bg-brand/30 selection:text-text-primary` (highlight text with brand overlay)

### Spacing Rhythm

**Grid:** 8px base unit (Tailwind default), with custom 4px refinements visible in small gaps.

#### Common Spacings
| Utility | Pixels | Usage |
|---------|--------|-------|
| Gap (compact) | `gap-1.5` → `gap-2` | Between icons + text |
| Gap (normal) | `gap-3` → `gap-4` | Between sections |
| Gap (loose) | `gap-6` | Between major content zones |
| Padding (tight) | `p-2` → `p-3` | Card interiors, small containers |
| Padding (normal) | `p-4` → `p-5` | Standard card padding |
| Padding (loose) | `p-6` → `p-8` | Large content areas |

**Sidebar Header:** `h-14` (56px, fixed height) with `px-4` (16px horizontal)  
**Main Content Card:** `px-5 md:px-8` (20px → 32px), `py-5` (20px vertical)  
**Footer Sections:** `px-4 md:px-6` (16px → 24px), `py-3` (12px vertical)

### Border Radius

| Size | Pixels | Usage |
|------|--------|-------|
| `rounded-sm` | 4px | Minimal curves, small icons |
| `rounded-md` | 8px | Buttons, input fields |
| `rounded-lg` | 16px | Cards, content containers |
| `rounded-xl` | 24px | Prominent cards, thumbnails |
| `rounded-full` | 9999px | Pill buttons, avatars, badges |

### Box Shadows

| Name | CSS | Usage |
|------|-----|-------|
| `shadow-sm` | `0 2px 8px rgba(0,0,0,0.10)` | Subtle elevation, hover states |
| `shadow-md` | `0 4px 16px rgba(0,0,0,0.12)` | Standard card shadow |
| `shadow-lg` | `0 8px 24px rgba(0,0,0,0.16)` | Prominent elements (main content card) |
| `shadow-xl` | `0 8px 24px rgba(0,0,0,0.16)` | Main content wrapper |
| `shadow-inner` | Built-in | Inset shadows on lesson thumbnails |

**Special Effects:**
- `ring-1 ring-bordercolor-light` / `dark:ring-bordercolor-dark` — thin outline (1px equivalent)
- `backdrop-blur-md` / `backdrop-blur-xl` — frosted glass on header + sidebars

### Gradients & Visual Effects

**Background Gradient Pattern:** Grid overlay across entire viewport
```css
background-image:
  linear-gradient(to right, rgba(59, 23, 1, 0.04) 1px, transparent 1px),
  linear-gradient(to bottom, rgba(59, 23, 1, 0.04) 1px, transparent 1px);
background-size: 32px 32px;
/* Mask fades from opaque at top to transparent at bottom */
mask-image: linear-gradient(to bottom, black 0%, black 30%, transparent 100%);
```

**Top Glow:** Centered radial blur at viewport top (brand gold)
```css
position: absolute; top: -20%; left: 50%;
w-[80vw] max-w-[1200px] h-[400px];
bg-brand/15 (light) or bg-brand/5 (dark);
blur-[100px]; mix-blend-multiply (light) or mix-blend-screen (dark);
```

**Chat Bubble Tail:** Rotated 45° diamond using `border-l border-b transform rotate-45`

**Animation Examples:**
- `btn-hover-scale`: `transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)` — slight scale on hover/active
- `typing-dot`: Bouncing dots with staggered delay (0.16s, 0.32s)
- `sidebar-transition`: `transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(...)`
- `animate-ping`: Pulse ring on notification badge
- Smooth dark mode toggle: `transition-colors duration-500`

---

## 3. COMPONENTS ON THE PAGE

### A. Left Sidebar — "课程大纲" (Lesson Outline)

**Dimensions:** `w-[260px]`, `h-full`, scrollable (custom scrollbar hidden on overflow)

**Structure:**
1. **Header** (`h-14`, border-b)
   - Icon badge: Layers icon in 6×6 box with secondary background
   - Label: "课程大纲" (bold, `text-sm`, all-caps tracking)
   - Close button (hamburger on mobile, panel-left-close on desktop)

2. **Scrollable Content** (flex-1, custom-scroll class)
   - **Lesson Item 1:** "引言：简单导数复习"
     - Badge circle with "1" (secondary bg, `w-4 h-4`, smaller font)
     - Lesson title (xs, bold)
     - Thumbnail: aspect-video, 50% opacity, `mix-blend-luminosity` (desaturated)
     - Background: secondary/lighter, border with ring
     - Hover: `hover:bg-secondary/60` (lighter fill)
   
   - **Lesson Item 2:** "复合函数与链式法则" (ACTIVE/CURRENT)
     - Badge: Numbered "2" in **brand gold** with shadow
     - Title: bold, brand highlight text color
     - Thumbnail: full opacity (90%), brighter, active ring effect
     - Background: `bg-brand/5` with `border-brand/30` (golden tint)
     - Shadow: `shadow-sm` (active emphasis)

**Responsive:** Collapses to width 0 on desktop when user clicks collapse button; stays mobile-offscreen by default.

---

### B. Header — Top Navigation Bar

**Dimensions:** `h-16` (64px), full width, sticky border-b

**Sections:**

1. **Left Zone** (Flex start)
   - **Mobile Menu Button** (hamburger icon, md:hidden)
   - **Desktop Outline Toggle** (panel-left-open button, hidden md:block)
   - **Title Block:**
     - Label: "Calculus 101" (uppercase, xs, secondary text, tracking-widest)
     - H1: "微分与导数基础应用" (base md:text-base, bold, primary text, truncate)

2. **Right Zone** (Flex end, compact toolbar)
   - Background: `bg-secondary/30` rounded-full, pill-shaped
   - Buttons (with hover transitions):
     - "📎 来源依据" (hidden lg:flex, attachments reference)
     - "⬇️ 导出 PPTX" (hidden md:flex)
     - **Theme Toggle** (moon/sun icon, always visible, transforms on click)
     - **Companion Sidebar Toggle** (bot icon, visible md:flex)
   - Dividers: `w-px h-4` bordercolor lines between buttons

**Responsive:** Buttons progressively hidden on smaller screens (lg: sources, md: export/companion toggle)

---

### C. Main Content Area — Scene/Lesson Card

**Dimensions:** `aspect-video h-full max-h-full`, centered in flex container with padding (p-2 md:p-3 lg:p-4)

**Structure:**

1. **Scene Header Bar** (`px-5 py-3`, border-b, shrink-0)
   - Brand dot indicator (2×2 rounded-full)
   - "SCENE 02" label (xs, bold, monospace, tracking-wider)

2. **Main Content Zone** (`flex-1`, `px-5 md:px-8 py-5`, overflow-hidden)
   - **Title:** "理解链式法则 (Chain Rule)" (xl md:text-2xl, bold)
   
   - **Responsive Grid:** `grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]` (stacks on mobile, side-by-side on desktop)
     
     **Left Column (1.1fr):**
     - Explanatory text block (text-[13px], leading-relaxed, secondary color)
     - Formula box:
       - Background: `bg-secondary/40` (light tint)
       - Border: left accent border (`border-l-4 border-l-brand`)
       - Padding: `p-3 md:p-4`
       - Label: "公式定义" (xs, mono, bold)
       - Math formula with **colored spans** (brand gold for y=f(u), blue #0091FF for u=g(x), derivation in inline code box)
       - Result: `dy/dx = (dy/du) · (du/dx)` (highlighted)
     
     - Bullet list (space-y-2):
       - Green checkmarks in circular badges (`bg-success/10`, success text color)
       - Two key points about chain rule decomposition
     
     **Right Column (0.9fr):**
     - Relationship diagram / flow visualization
     - Background: `bg-secondary/30` with subtle grid overlay (`16px×16px` checkered)
     - Five nodes arranged horizontally: **x → u → y** with operators between
       - **x node:** white surface box, monospace "x", label "Input" (xs, secondary)
       - **Arrow + g'(x) label** (blue #0091FF color)
       - **u node:** white box, **bordered in blue #0091FF**, monospace "u", label "Middle"
       - **Arrow + f'(u) label** (brand gold)
       - **y node:** **brand gold background**, dark text, monospace "y", label "Output"
     - Small responsive sizing: `w-10 h-10 lg:w-12 lg:h-12` (scales with breakpoint)

**Visual Hierarchy:** Card uses `rounded-lg` with `ring-1` border and `shadow-xl` for depth.

---

### D. Footer — Next Steps & Teacher Interaction

**Dimensions:** Full width, `shrink-0`, `py-3`, contains max-width container

**Three Sub-sections:**

1. **Callout Card — "课后衔接入口"** (rounded-2xl, secondary/30 bg)
   - Icon: graduation cap (brand color)
   - Title: "课后衔接入口" (bold, primary text)
   - Badge: "继续巩固" (xs, secondary bg, pills style)
   - Description: (text-[12px], secondary color) — explains next steps (materials, quiz, learning path)
   - Buttons (flex-wrap, pills with borders/fills):
     - "资料依据" (outline button)
     - "Checkpoint" (solid dark button, prominent)
     - "正式 Quiz" (outline)
     - "生成学习路径" (outline)

2. **Teacher Bubble** (flex items-start, gap-3)
   - **Avatar Column:**
     - Avatar image (10×10, rounded-full, border-2, ring-2, success dot indicator at bottom-right)
     - Label: "Teacher" (xs, bold, agent-serious blue color)
   
   - **Chat Bubble:** (flex-1, rounded-xl, secondary bg, border, relative)
     - Tail: rotated diamond (`absolute -left-1.5 top-4`)
     - Text: explanation about chain rule machinery metaphor (mentions u=g(x), colors inline code)
   
   - **Listeners Column** (hidden sm:flex, left border divider)
     - Stacked avatar group (overlap -space-x-2, hover scale effects)
     - Label: "Listeners" (xs, secondary)

3. **Playback Controls** (flex items-center, gap-2 md:gap-3)
   - **Play/Pause Button:** `w-9 h-9` brand gold, rounded-full with pause icon
   - **Timestamp:** "03:15" (xs, mono, centered in w-10)
   - **Progress Bar:** `h-9 md:h-10`, rounded-full, flex with message icon + input field + send button
     - Input: placeholder "向老师提问或打断..." (suggest interaction)
     - Send button: brand gold arrow icon, small shadow
     - Focus state: `focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20`
   - **Action Buttons:** (hidden sm: on mobile)
     - Raise hand icon
     - Fullscreen icon

---

### E. Right Sidebar — "伴学助手" (Companion Assistant)

**Dimensions:** `w-[300px] xl:w-[340px]`, h-full, scrollable

**Structure:**

1. **Header** (`px-5 pt-5 pb-4`, border-b, shrink-0)
   - Title: "伴学助手" with bot icon (brand color), bold 15px
   - Close button (panel-right-close on desktop, x on mobile)
   - Tab Switcher (secondary bg, rounded-lg):
     - **"课堂笔记"** (Notes) — active by default (solid surface bg)
     - **"互动答疑"** (Q&A) — inactive (transparent, secondary text), includes ping animation badge

2. **Tab Content Area** (flex-1, overflow-y-auto custom-scroll, p-4)
   
   **Tab 1: Notes (课堂笔记)**
   - Card 1: Light surface bg, border, rounded-xl, shadow-sm
     - Header: "导数基本性质复习" (xs, bold) + timestamp "00:00" (xs, mono, secondary)
     - Body: Two formula lines in monospace on secondary bg: `(f+g)' = f' + g'` and `(fg)' = f'g + fg'`
   
   - Card 2: Light surface bg, **brand border accent** (border-brand/50), rounded-xl
     - Left accent bar (w-1, bg-brand)
     - Header: Play icon (brand) + "本节重点" (bold) + timestamp badge in brand (xs, mono)
     - Body: Bulleted list (marker-color: brand) with two points about chain rule (text-[13px])

   **Tab 2: Chat (互动答疑)** — hidden by default, toggled via switchTab()
   - Student message bubble:
     - Avatar (6×6, secondary bg)
     - Question: "如果嵌套了三层函数怎么办？" (bold)
   
   - Assistant response (secondary bg):
     - Avatar (teal #00C48C agent color)
     - Reply: explanation about three-nested functions, y=f(g(h(x))) formula
     - Text-xs, secondary color

**Responsive:** Fixed offscreen on mobile (translate-x-full), slides in on toggle. Desktop: visible by default (relative position).

---

## 4. DATA / SECTIONS SHOWN

### What Classroom Result Data Is Displayed?

This is **NOT a traditional test results page** with scores/grades. Instead, it's a **lesson content review/reflection page** shown during or after a classroom session. Data includes:

- **Lesson Metadata:**
  - Course code: "Calculus 101"
  - Lesson title: "微分与导数基础应用"
  - Current scene: "SCENE 02" — "理解链式法则 (Chain Rule)"
  - Lesson outline with thumbnails (2+ scenes available for navigation)

- **Educational Content:**
  - Textual explanation of the chain rule concept
  - Mathematical formula definition with colored variable highlighting
  - Key takeaways as bulleted checkmarks
  - Relationship diagram (x → u → y flow)

- **Teacher Interaction:**
  - Live teacher bubble message (explaining the machinery metaphor)
  - Real-time listener avatars (collaborative learning)
  - Suggested next steps: materials review, checkpoint quiz, formal quiz, learning path generation

- **Student Tools:**
  - Classroom notes (timestamped formula snippets, highlighted key points)
  - Q&A section (student questions answered by assistant/teacher)
  - Chat input to ask teacher or interrupt
  - Playback timeline (03:15 mark, play/pause control)
  - Raise hand / fullscreen controls

- **No Scoring/Metrics:** This page does **not** show:
  - Test score percentages
  - Question-by-question results
  - Knowledge mastery/weakness indicators
  - Time spent analytics
  - Performance comparisons

**Page Purpose:** Reinforce learning during active lesson delivery + provide navigation to next learning steps (review materials, checkpoint, quiz, personalized learning path).

---

## 5. ICON LIBRARY USED

**Library:** **Lucide React Icons** (via `unpkg.com/lucide@latest`)

**Icons Visible:**
- `menu` — hamburger (mobile header)
- `panel-left-open` / `panel-left-close` — sidebar toggles
- `panel-right-open` / `panel-right-close` — right sidebar toggles
- `x` — close/dismiss
- `moon` / `sun` — theme toggle
- `bot` — assistant indicator
- `paperclip` — attachments/sources
- `download` — export PPTX
- `layers` — outline/structure icon
- `check` — success checkmarks
- `arrow-right` — flow diagram arrows
- `graduation-cap` — next steps education icon
- `pause` — playback control
- `message-square` — chat input icon
- `arrow-up` — send message button
- `hand` — raise hand
- `maximize` — fullscreen
- `play-circle` — emphasis marker

**CDN:** `<script src="https://unpkg.com/lucide@latest"></script>` + `lucide.createIcons()` on page load

---

## 6. LIBRARIES REFERENCED VIA CDN

1. **Google Fonts**
   ```html
   <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+SC:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap">
   ```
   - **Inter** (sans-serif, Latin alphabet)
   - **Noto Sans SC** (Chinese characters, supporting text)
   - **JetBrains Mono** (code/formula blocks)

2. **Tailwind CSS**
   ```html
   <script src="https://cdn.tailwindcss.com"></script>
   ```
   - Full Tailwind v3 via CDN
   - Custom theme config injected inline (brand colors, radii, shadows, fonts)

3. **Lucide Icons**
   ```html
   <script src="https://unpkg.com/lucide@latest"></script>
   ```
   - Lightweight SVG icon set
   - Initialized on page load with `lucide.createIcons()`

4. **UI Avatars API**
   ```html
   <img src="https://ui-avatars.com/api/?name=...&background=...&color=...&size=128">
   ```
   - Placeholder avatar generation for teacher, students, listeners

**No Chart.js / ECharts:** Diagrams are hand-drawn HTML/Tailwind (node boxes, arrows). Playback timeline is a styled input range.

---

## 7. RESPONSIVE BEHAVIOR

### Breakpoints (Tailwind)
- `sm:` 640px
- `md:` 768px ← **Major shift: sidebars become relative, not fixed**
- `lg:` 1024px ← **Layout expands, hidden elements visible**
- `xl:` 1280px ← **Companion sidebar grows to 340px**

### Mobile-Specific (< 768px)
- **Sidebars:** Fixed, off-screen by default (`-translate-x-full` left, `translate-x-full` right)
- **Mobile Overlay:** Semi-transparent backdrop (toggled on sidebar open)
- **Header Buttons:** Hamburger visible, scene outline button hidden, export/sources buttons hidden
- **Main Content:** Unaffected, always centered
- **Footer:** Full width, buttons stack/wrap more aggressively
- **Right Sidebar:** Companion toggle visible (bot icon); when open, left sidebar auto-closes

### Tablet (768px ≤ width < 1024px)
- **Sidebars:** Relative (not fixed), always visible side-by-side
- **Header:** More button spacing (md:gap-3)
- **Main Content:** Grid remains responsive (might still stack if narrow)
- **Footer:** Less wrapping, more horizontal layout
- **Some Hidden Content:** Sources button still hidden, export visible

### Desktop (≥ 1024px)
- **All Sidebars:** Visible
- **Main Content:** Full responsive grid (1.1fr + 0.9fr side-by-side diagram)
- **Header:** All buttons visible (sources, export, theme, companion)
- **Footer:** Horizontal layout, all actions inline
- **Typography:** Larger font sizes (text-base for h1, text-2xl for card title)
- **Spacing:** Looser gaps (gap-6), larger padding (px-8)

### Media Queries in Code
- `md:hidden` — hamburger button (mobile only)
- `hidden md:block` — scene outline button (desktop+)
- `hidden md:flex` — export button
- `hidden lg:flex` — sources button
- `hidden lg:block` — divider after sources
- `hidden sm:` — various labels/icons
- `grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]` — stacking on mobile

**No Explicit CSS Media Queries:** All responsive behavior uses Tailwind utility classes. The custom CSS handles theme transitions, animations, and scrollbar styling (not screen-dependent).

---

## 8. COPY & TEXT TONE

### Chinese Copy Examples

**Course Title:** "微分与导数基础应用"  
(Literally: "Differential & Derivative Foundation Application")  
— Technical, academic, precise

**Scene Title:** "理解链式法则 (Chain Rule)"  
— Bilingual, combining Chinese + English mathematical terms

**Explanation Text:** "链式法则是微积分中求复合函数导数的重要定理。当我们将一个函数嵌套在另一个函数中时，总的变化率并非简单的相加。"  
(Translation: "The chain rule is an important theorem in calculus for finding derivatives of composite functions. When we nest one function inside another, the total rate of change is not simply additive.")  
— Clear, pedagogical, explains why the concept matters

**Key Takeaway Copy:** "将复杂问题拆分为多道'工序'。" & "每一层只对自己的直接变量求导。"  
(Translations: "Decompose complex problems into multiple 'processes'." & "Differentiate only with respect to your direct variable at each layer.")  
— Metaphorical, uses factory/machine analogy ("工序" = process steps)

**Teacher Bubble:** "大家可以看到右侧的流程图。如果把 u = g(x) 当作第一台机器，它的效率是 g'(x)；第二台机器效率是 f'(u)。整体的效率自然是两者的乘积。"  
(Translation: "Everyone can see the flow diagram on the right. If we think of u = g(x) as a first machine with efficiency g'(x), and the second machine with efficiency f'(u), then the overall efficiency is naturally the product of the two.")  
— Conversational, uses extended metaphor (machine/efficiency), references visual diagram

**Next Steps Card:** "学完这节课后，你可以继续查看资料依据、做一个快速小测，或者直接进入正式练习和学习路径推荐。"  
(Translation: "After finishing this lesson, you can review the reference materials, do a quick checkpoint, or jump directly into formal practice and personalized learning path recommendations.")  
— Supportive, action-oriented, clear choices

**Button Copy:** "来源依据" (Source References), "导出 PPTX" (Export PPTX), "Checkpoint", "正式 Quiz" (Formal Quiz), "生成学习路径" (Generate Learning Path)  
— Mix of technical terms (English for standard concepts) + Chinese for pedagogical labels

### Tone Summary
- **Academic + Approachable:** Precise mathematical language paired with metaphors (factories, machines)
- **Supportive:** Encourages next steps with gentle phrasing ("可以继续") rather than demands
- **Bilingual:** Mixes Chinese + English for clarity on technical terms (Chain Rule, Quiz, Checkpoint)
- **Visual Scaffolding:** Copy frequently references on-screen diagrams ("右侧的流程图")

---

## 9. PORTING TO REACT + TAILWIND + SHADCN/UI

### Component Map

| HTML Element | React Component | shadcn/ui Equivalent | Notes |
|---|---|---|---|
| Sidebar toggle + panel | State + conditional render | (none) | Use React state, custom hooks for `isMobile()` detection |
| Header nav bar | Header component | (custom or nav) | Build from scratch; header is mostly custom styling |
| Main card (aspect-video) | Card | `Card` | Wrapper for content, uses shadow-xl + ring-1 |
| Scene title + content grid | Article / Section | (none) | Standard div grid with Tailwind utilities |
| Formula box | Callout / Code block | `Card` + syntax highlighting | Consider `CodeBlock` or custom `<pre>` |
| Bullet list with icons | List | (none) | Use list component + icon from lucide-react |
| Teacher avatar + bubble | Avatar + Card | `Avatar` + `Card` | shadcn Avatar for images + custom bubble styling |
| Next steps callout | Alert or Card | `Alert` + Button set | Buttons can use shadcn `Button` component |
| Playback bar | Slider | `Slider` | Wrap input[type=range] in shadcn Slider |
| Tabs (Notes vs. Q&A) | Tabs | `Tabs` | shadcn Tabs component (TabsList, TabsTrigger, TabsContent) |
| Q&A messages | Chat bubbles | (none) | Custom styling; consider shadcn Message or build custom |
| Input field for chat | Input | `Input` | shadcn Input component |

### Recommended React Structure

```jsx
// ClassroomResultPage.jsx
import { useState } from 'react';
import { useMediaQuery } from './hooks/useMediaQuery';
import Header from './components/Header';
import SceneOutlineSidebar from './components/SceneOutlineSidebar';
import MainSceneCard from './components/MainSceneCard';
import Footer from './components/Footer';
import CompanionSidebar from './components/CompanionSidebar';
import MobileOverlay from './components/MobileOverlay';

export default function ClassroomResultPage() {
  const [sceneOutlineOpen, setSceneOutlineOpen] = useState(false);
  const [companionOpen, setCompanionOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('notes');
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-bg-light dark:bg-bg-dark">
      {/* Background pattern + glow */}
      <BackgroundPattern />
      
      {/* Mobile overlay */}
      <MobileOverlay
        visible={sceneOutlineOpen || companionOpen}
        onClose={() => {
          setSceneOutlineOpen(false);
          setCompanionOpen(false);
        }}
      />

      {/* Left sidebar */}
      <SceneOutlineSidebar
        isOpen={sceneOutlineOpen}
        onToggle={() => setSceneOutlineOpen(!sceneOutlineOpen)}
        isMobile={isMobile}
      />

      {/* Main area */}
      <main className="flex-1 flex flex-col min-w-0">
        <Header
          onSceneToggle={() => setSceneOutlineOpen(!sceneOutlineOpen)}
          onCompanionToggle={() => setCompanionOpen(!companionOpen)}
          isMobile={isMobile}
        />
        <MainSceneCard />
        <Footer />
      </main>

      {/* Right sidebar */}
      <CompanionSidebar
        isOpen={companionOpen}
        onToggle={() => setCompanionOpen(!companionOpen)}
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
        isMobile={isMobile}
      />
    </div>
  );
}
```

### Color Palette for Tailwind Config

```javascript
// tailwind.config.js extend section
colors: {
  brand: { DEFAULT: '#f5c547', dark: '#e6b841' },
  secondary: { DEFAULT: '#f5ede1', dark: '#2a2420' },
  decorative: '#3b1701',
  bg: { light: '#f5ede1', dark: '#110e0d' },
  surface: { light: '#ffffff', dark: '#1f1a18' },
  text: {
    primary: '#3b1701',
    'primary-dark': '#f5ede1',
    secondary: '#6b4421',
    'secondary-dark': '#a89f91'
  },
  bordercolor: { light: '#e6dcc8', dark: '#302824' },
  agent: {
    efficient: '#6D5DF4',
    humorous: '#FFB020',
    patient: '#00C48C',
    serious: '#0091FF'
  },
  success: { DEFAULT: '#52c41a', dark: '#51d712' },
  warning: { DEFAULT: '#ff6700', dark: '#f34700' },
  error: { DEFAULT: '#f82834', dark: '#bf0004' }
}
```

### Spacing & Sizes (Tailwind Alignment)

```javascript
// theme extend
spacing: {
  // Already standard Tailwind; no custom overrides needed
  // Use: gap-2, gap-3, gap-4, gap-6 for standard spacing
  // p-2, p-3, p-4, p-5, p-6, p-8 for padding
},
borderRadius: {
  'sm': '4px',
  'md': '8px',
  'lg': '16px',
  'xl': '24px',
  'full': '9999px'
},
boxShadow: {
  'sm': '0 2px 8px rgba(0, 0, 0, 0.10)',
  'md': '0 4px 16px rgba(0, 0, 0, 0.12)',
  'lg': '0 8px 24px rgba(0, 0, 0, 0.16)',
}
```

### Key React Hooks Needed

```jsx
// hooks/useMediaQuery.js
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) setMatches(media.matches);
    
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);
  
  return matches;
}

// hooks/useTheme.js
export function useTheme() {
  const [theme, setTheme] = useState('light');
  
  useEffect(() => {
    const saved = localStorage.getItem('xiaomai-theme') || 'light';
    setTheme(saved);
    document.documentElement.classList.toggle('dark', saved === 'dark');
  }, []);
  
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('xiaomai-theme', newTheme);
    document.documentElement.classList.toggle('dark');
  };
  
  return { theme, toggleTheme };
}
```

### Typography Classes (Tailwind Styles)

```jsx
// Page title (h1)
<h1 className="text-sm md:text-base font-bold text-text-primary dark:text-text-primary-dark truncate">
  微分与导数基础应用
</h1>

// Card title (h2)
<h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-5 text-text-primary dark:text-text-primary-dark">
  理解链式法则 (Chain Rule)
</h2>

// Body text
<p className="text-[13px] md:text-sm leading-relaxed text-text-secondary dark:text-text-secondary-dark">
  {content}
</p>

// Small label
<span className="text-xs font-bold uppercase tracking-widest text-text-secondary/80 dark:text-text-secondary-dark/80">
  Calculus 101
</span>

// Monospace code
<code className="font-mono text-xs bg-surface-light dark:bg-surface-dark px-1.5 py-0.5 rounded border border-bordercolor-light dark:border-bordercolor-dark mx-1">
  u = g(x)
</code>
```

### Animation Classes (Custom CSS in globals)

```css
@layer components {
  .btn-hover-scale {
    @apply transition-transform duration-200 ease-in-out;
  }
  
  .btn-hover-scale:hover {
    @apply scale-105;
  }
  
  .btn-hover-scale:active {
    @apply scale-95;
  }
  
  .sidebar-transition {
    @apply transition-all duration-300 ease-in-out;
  }
  
  .custom-scroll {
    @apply scrollbar-hide;
  }
  
  .custom-scroll::-webkit-scrollbar-thumb {
    @apply bg-bordercolor-light dark:bg-bordercolor-dark rounded;
  }
}
```

### Key Design System Notes for React Engineers

1. **Color Access:** Avoid hardcoding colors; use Tailwind tokens (e.g., `bg-brand`, `text-agent-serious`)
2. **Dark Mode:** Always pair light + dark utilities (e.g., `text-text-primary dark:text-text-primary-dark`)
3. **Responsive:** Use Tailwind breakpoints; avoid custom media queries unless necessary
4. **Icons:** Import from `lucide-react` package; all icons in mockup are available (e.g., `<Menu />`, `<X />`, `<Bot />`)
5. **Spacing Consistency:** Use defined Tailwind spacing values (gap-1, gap-2, gap-3, etc.); avoid arbitrary values
6. **Shadows:** Only use `shadow-sm`, `shadow-md`, `shadow-lg` (custom config provided)
7. **Border Radius:** Use predefined sizes (sm, md, lg, xl, full); no custom values
8. **Animations:** Keep to simple `transition`, `scale`, `opacity`; complex animations (typing dots, ping) can use Tailwind keyframes or custom CSS

---

## 10. DESIGN ELEMENTS: MUST KEEP vs. CAN ADAPT

### MUST KEEP (Core Identity)

- **Color Palette:** Warm gold brand (#f5c547), cream secondary (#f5ede1), dark brown text (#3b1701) — these are XiaoMai brand identity
- **Typography:** Inter (Latin) + Noto Sans SC (Chinese) combination — professional, readable
- **Three-Column Layout:** Left outline, center content, right assistant — key to classroom workflow
- **Aspect-Video Main Card:** 16:9 content window for lesson/scene playback
- **Dark Mode Support:** Full dark palette provided; must maintain light/dark classes everywhere
- **Teacher Bubble + Chat:** Social learning element (teacher voice, listener avatars) — core to pedagogical design
- **Tab System (Notes vs. Q&A):** Dual-panel assistant design allows content + interaction simultaneously
- **Next Steps Callout:** Post-lesson navigation (materials, checkpoint, quiz, path) — critical UX flow

### CAN ADAPT (Implementation Details)

- **Specific Icons:** Lucide is a suggestion; can switch to Heroicons, Tabler, or custom SVGs as long as functionality is clear
- **Avatar Generation:** UI Avatars API can be replaced with Gravatar, placeholder images, or user-provided avatars
- **Lesson Thumbnail Images:** Current unsplash.com placeholders should be replaced with real course media
- **Formula Rendering:** Current `<code>` blocks can upgrade to MathJax/KaTeX for proper mathematical notation
- **Playback Bar:** Current `<input type="range">` can become a custom timeline UI with tick marks, markers, chapter labels
- **Grid Overlay Pattern:** Subtle background texture — can be removed or adjusted in opacity without affecting functionality
- **Glow Gradient:** Top-of-page radial glow is decorative; can be simpler or disabled
- **Font Sizes (px values):** Text sizes using `text-[13px]`, `text-[11px]` can be normalized to standard Tailwind sizes (sm, base, xs) for consistency, provided contrast ratios remain compliant
- **Button Styles:** Pill buttons, outlined vs. filled — can be refactored to use shadcn Button component presets
- **Chat Bubble Tail:** Rotated diamond can be replaced with CSS arrow pointer or icon
- **Animations:** Typing dots, ping badge, scale hover effects can be simplified or enhanced as performance/UX testing suggests

### MUST NOT CHANGE

- **Light/Dark Mode Toggle:** This is a core feature; must remain accessible
- **Responsive Sidebar Collapsibility:** Mobile UX depends on this; must maintain
- **Accessibility:** Semantic HTML, proper ARIA labels for icons/buttons, focus states
- **Content Hierarchy:** Scene outline > main content > assistant — visual weight should reflect this
- **Feedback on User Actions:** Hover states, active states, transitions — provides confidence to users

---

## 11. SUMMARY FOR ENGINEERING HANDOFF

### Immediate Next Steps

1. **Set up Tailwind config** with the custom color palette (see Section 2 + Section 9)
2. **Create base components:** Header, Sidebar (left), MainCard, Footer, Sidebar (right)
3. **Integrate lucide-react** for icons; no custom icon set needed
4. **Build responsive layout** using Tailwind's md:/lg:/xl: breakpoints; avoid manual media queries
5. **Implement theme toggle** with localStorage persistence + document.documentElement.classList toggling
6. **Wire up mobile toggle behavior** for sidebars (useState + isMobile hook + CSS transforms)

### File Structure Recommendation

```
src/
  components/
    layout/
      Header.jsx
      SceneOutlineSidebar.jsx
      CompanionSidebar.jsx
      Footer.jsx
    scenes/
      MainSceneCard.jsx
    ui/
      BackgroundPattern.jsx
      MobileOverlay.jsx
  hooks/
    useMediaQuery.js
    useTheme.js
  pages/
    ClassroomResultPage.jsx
  styles/
    globals.css (animations, scrollbar, custom utilities)
  config/
    theme.js (Tailwind config excerpt)
```

### Estimated Component Effort

| Component | Effort | Notes |
|-----------|--------|-------|
| Header | Small | Nav bar with buttons; mostly Tailwind |
| Scene Outline Sidebar | Small | Scrollable list + toggle logic |
| Main Scene Card | Medium | Responsive grid (text + diagram), formula box styling |
| Footer | Medium | Multi-section callout + teacher bubble + controls |
| Companion Sidebar | Small | Tabs + scrollable content areas |
| Background Pattern | Small | CSS grid pattern + glow (can be reusable) |
| Overall App Shell | Small | Context providers for theme + mobile state |
| **Total** | **~4-5 days** (one engineer) | Includes testing, refinement, dark mode QA |

### Color Quick Reference (for copy-paste)

```javascript
const colors = {
  brand: '#f5c547',
  brandDark: '#e6b841',
  secondary: '#f5ede1',
  secondaryDark: '#2a2420',
  bgLight: '#f5ede1',
  bgDark: '#110e0d',
  surfaceLight: '#ffffff',
  surfaceDark: '#1f1a18',
  textPrimary: '#3b1701',
  textSecondary: '#6b4421',
  agentSerious: '#0091FF', // Teacher
  success: '#52c41a',
  warning: '#ff6700',
  error: '#f82834'
};
```

---

## Appendix: HTML Structure Outline

```
<html>
  <head>
    Fonts: Inter, Noto Sans SC, JetBrains Mono
    Tailwind CSS CDN
    Lucide Icons CDN
    Custom Tailwind config (inline)
    Custom CSS (animations, scrollbar, patterns)
  </head>
  <body>
    <div class="global-background">
      Grid pattern + glow gradient
    </div>
    
    <div class="mobile-overlay">
      Semi-transparent click-to-close
    </div>
    
    <aside id="scene-sidebar">
      Header (h-14) + scrollable content (flex-1)
      Lesson items with thumbnails
    </aside>
    
    <main>
      <header>
        Mobile hamburger + title + action buttons + theme toggle
      </header>
      
      <div class="canvas">
        Centered aspect-video card
        - Scene header bar
        - Title
        - Responsive grid (text + diagram)
      </div>
      
      <footer>
        Next steps callout + teacher bubble + playback controls
      </footer>
    </main>
    
    <aside id="companion-sidebar">
      Header + tabs (notes / Q&A) + scrollable content
    </aside>
  </body>
  <script>
    Lucide initialization
    Theme toggle logic
    Sidebar toggle logic (mobile + desktop)
    Tab switching logic
  </script>
</html>
```

---

## Final Checklist for React Implementation

- [ ] Tailwind config includes all brand colors
- [ ] Dark mode utilities applied to every color-dependent element
- [ ] Media query breakpoints tested on actual devices (mobile/tablet/desktop)
- [ ] Theme toggle persists across page reloads
- [ ] Sidebar collapsibility works on desktop (width toggle) + mobile (offscreen animation)
- [ ] Lucide icons render correctly (check for missing icons)
- [ ] Typography sizes and weights match mockup (especially h1, h2, body, code)
- [ ] Main content card uses aspect-video and maintains 16:9 ratio
- [ ] Footer buttons link to next-steps pages (checkpoint, quiz, learning path)
- [ ] Teacher bubble appears with correct agent color (serious blue #0091FF)
- [ ] Playback controls functional (pause, progress input, message input)
- [ ] Responsive padding/spacing adjusts per breakpoint
- [ ] Scrollbar styling applied (custom scrollbar for overflow areas)
- [ ] Background grid pattern visible and fades at bottom
- [ ] Animations smooth (sidebar transitions, button hovers, theme toggle)
- [ ] Accessibility: buttons labeled, icons have aria-labels, focus states visible
- [ ] Performance: no unnecessary re-renders, lazy-load sidebar content if needed

---

**End of Audit Report**
