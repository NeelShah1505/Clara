---
name: Clara
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e4e2e1'
  on-surface: '#1b1c1c'
  on-surface-variant: '#444748'
  inverse-surface: '#303030'
  inverse-on-surface: '#f3f0ef'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#605e57'
  on-secondary: '#ffffff'
  secondary-container: '#e6e2d8'
  on-secondary-container: '#66645d'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#2e131e'
  on-tertiary-container: '#a17987'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#e6e2d8'
  secondary-fixed-dim: '#cac6bd'
  on-secondary-fixed: '#1c1c16'
  on-secondary-fixed-variant: '#484740'
  tertiary-fixed: '#ffd9e5'
  tertiary-fixed-dim: '#e8baca'
  on-tertiary-fixed: '#2e131e'
  on-tertiary-fixed-variant: '#5f3d4a'
  background: '#fcf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e1'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: '1.6'
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0.01em
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.05em
  nav-item:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-padding: 2rem
  gutter: 1.5rem
  card-padding: 1.5rem
  sidebar-width: 260px
  stack-gap-sm: 0.5rem
  stack-gap-md: 1rem
  stack-gap-lg: 2rem
---

## Brand & Style

The design system is engineered for **Intelly Finance**, a premium personal wealth management platform. The brand personality is "The Sophisticated Architect"—organized, calm, and intellectually rigorous, yet approachable. It targets a demographic of high-earning professionals and tech-savvy investors who value aesthetic precision as much as functional clarity.

The visual style is a fusion of **Modern Minimalism** and **Tactile Card-Based UI**. It utilizes a sophisticated "Off-White" canvas to reduce eye strain during long data-analysis sessions, contrasted with a high-authority dark sidebar that grounds the application. The system leverages soft pastels for data categorization, replacing harsh red/green financial tropes with a more nuanced, editorial color language. 

The emotional response is one of **financial serenity** and **effortless control**. Every interaction is designed to feel intentional and premium, utilizing generous white space and rhythmic structural alignments to make complex data feel digestible.

## Colors

This design system employs a **Natural Sophistication** palette. Unlike traditional fintech apps that use aggressive saturation, this system uses "muted-vibrant" pastels to distinguish financial categories (e.g., Spending, Savings, Investments).

- **Primary Canvas:** The #F9F5EB (Cream) background acts as a warm, non-clinical base.
- **Structural Contrast:** The sidebar and primary CTAs use a Deep Charcoal (#1A1A1A), providing a strong visual anchor and a sense of "Developer-grade" professionalism.
- **Semantic Accents:** 
    - **Pink (#F4C5D5):** High-priority alerts or "Investment" categories.
    - **Mint (#B4C5A1):** Growth or "Income" categories.
    - **Blue (#ADC5E5):** "Savings" or "Fixed Costs."
    - **Yellow (#F2E2A1):** "Discretionary" or "Variables."

Color should be applied to cards as solid background fills with high-contrast dark text to maintain readability and a "sticker-like" tactile quality.

## Typography

The design system utilizes **Inter** exclusively to achieve a clean, systematic appearance that feels like a modern developer tool. 

Key rules for typography:
- **Tracking:** Headlines should feature negative tracking (-1% to -2%) to appear tight and editorial. Labels and small body text require generous tracking (+1% to +5%) for maximum legibility in data-dense tables.
- **Hierarchy:** Use font weight rather than size to denote importance. Financial figures should always be semi-bold or bold.
- **Color:** Use Deep Charcoal for active text and a 60% opacity variant for secondary information or "muted" states. Avoid pure grey to keep the palette feeling warm.

## Layout & Spacing

The layout follows a **Hybrid Fixed-Fluid Grid** model. 

- **Sidebar:** A fixed-width (260px) vertical navigation stays anchored to the left.
- **Main Canvas:** A fluid 12-column grid that expands to fill the viewport, but maintains a maximum readable width of 1440px for content.
- **Spacing Rhythm:** Based on an 8px base unit. All margins and paddings must be multiples of 8 (8, 16, 24, 32, 48, 64).
- **Mobile Reflow:** On mobile, the sidebar collapses into a bottom navigation bar or a hamburger menu. The 12-column grid collapses to 1 column with 16px side margins.

Cards are the primary layout unit. Spacing between cards (gutter) is fixed at 24px to ensure the "soft shadow" of each card has room to breathe without overlapping adjacent shadows.

## Elevation & Depth

This design system uses **Tonal Layering** combined with **Ambient Shadows** to create a sense of physical organization.

- **Level 0 (Base):** The Cream background (#F9F5EB). No shadows.
- **Level 1 (Cards):** The primary interaction layer. Cards have a very subtle, large-radius shadow: `0 8px 30px rgba(0,0,0,0.04)`. This creates a "lifted" effect without looking heavy.
- **Level 2 (Popovers/Modals):** Elements that require immediate focus. These use a more defined shadow: `0 20px 50px rgba(0,0,0,0.1)`.
- **Sidebar Depth:** The sidebar does not use shadows; instead, it uses color contrast (solid dark against cream) to establish a clear hierarchy of navigation versus content.

## Shapes

The shape language is characterized by **Generous Radii**. 

- **Primary Containers/Cards:** Use a **24px** (Extra Large) corner radius to evoke a modern, friendly feel.
- **Secondary Elements (Inputs, Buttons):** Use a **12px** radius to maintain the rounded theme while fitting into smaller vertical spaces.
- **Chips/Badges:** Are fully pill-shaped (rounded-full) to distinguish them from interactive buttons.

This extreme roundedness is intentional—it offsets the "seriousness" of financial data, making the app feel like a lifestyle tool rather than an accounting spreadsheet.

## Components

### Buttons
- **Primary:** Solid #1A1A1A with white text. 12px border radius.
- **Secondary:** Transparent with a 1px border of `rgba(0,0,0,0.1)`.
- **Ghost:** No background, #1A1A1A text. Used for low-priority utility actions.

### Cards
- Each card should have a 24px radius.
- Use pastel background fills (#F4C5D5, etc.) for summary cards.
- Internal padding is strictly 24px on all sides.

### Data Visualization (Recharts Style)
- **Area Charts:** Use a 2px stroke width. The "area" fill should be a gradient from the stroke color (at 30% opacity) to 0% opacity.
- **Bar Charts:** Use rounded tops (radius: 4px).
- **Progress Rings:** Thick 8px strokes with rounded ends. Use the "Accent Mint" for positive progress and "Accent Pink" for over-budget states.

### Sidebar Items
- Active state: White text with a small pink dot indicator.
- Inactive state: 50% opacity white text.
- Hover state: 80% opacity white text with a subtle dark-grey background highlight.

### Input Fields
- Background-color: `rgba(0,0,0,0.03)` or solid white.
- Border: 1px solid `rgba(0,0,0,0.05)`.
- Focus state: 1px solid #1A1A1A.