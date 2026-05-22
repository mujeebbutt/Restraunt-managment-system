---
name: Modern POS Design System
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#3e494a'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#6f797a'
  outline-variant: '#bec8ca'
  surface-tint: '#006972'
  primary: '#00535b'
  on-primary: '#ffffff'
  primary-container: '#006d77'
  on-primary-container: '#9becf7'
  inverse-primary: '#82d3de'
  secondary: '#5b5f63'
  on-secondary: '#ffffff'
  secondary-container: '#dde0e5'
  on-secondary-container: '#5f6368'
  tertiary: '#713d10'
  on-tertiary: '#ffffff'
  tertiary-container: '#8e5426'
  on-tertiary-container: '#ffd7bd'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9ff0fb'
  primary-fixed-dim: '#82d3de'
  on-primary-fixed: '#001f23'
  on-primary-fixed-variant: '#004f56'
  secondary-fixed: '#e0e3e8'
  secondary-fixed-dim: '#c3c7cc'
  on-secondary-fixed: '#181c20'
  on-secondary-fixed-variant: '#43474c'
  tertiary-fixed: '#ffdcc5'
  tertiary-fixed-dim: '#ffb783'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#6d390c'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Outfit
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Outfit
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  data-mono:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 12px
  margin-desktop: 24px
  stack-sm: 8px
  stack-md: 16px
  touch-target-min: 44px
---

## Brand & Style
The design system is engineered for high-velocity retail and food-service environments. The brand personality is **reliable, efficient, and unobtrusive**, ensuring that the software never competes with the operator's speed of service. 

Drawing from **Minimalism** and **Corporate Modern** aesthetics, the UI prioritizes functional clarity over decorative flair. The visual language uses a "light-first" approach to maintain a clean workspace, reducing cognitive load during long shifts. Every element is designed to evoke a sense of professional stability, allowing the application to act as a dependable tool rather than just a digital interface. The white-label nature of this system ensures that while the default state is sophisticated, it provides a neutral canvas for diverse brand identities to be injected through color and typography.

## Colors
The color palette is anchored by a **Deep Teal** primary accent, chosen for its professional depth and high legibility against white backgrounds. This primary color is the "Brand Injection Point" and should be swapped to match the client's identity.

- **Surface Layers:** The base uses `#F8F9FA` for secondary containers and pure `#FFFFFF` for primary work surfaces to create subtle, eye-straining-free depth.
- **Typography & Icons:** A Charcoal (`#212529`) is used for primary text to ensure maximum contrast (AA/AAA compliant) without the harshness of pure black.
- **Functional Colors:** Success and Error states use slightly desaturated but deep tones to maintain the "Modern" feel while providing clear feedback on transaction statuses.

## Typography
The typography strategy employs a dual-font system to balance character with utility. 

- **Outfit** is used for headlines, prices, and major category names. Its geometric, modern structure provides a professional and slightly friendly tone.
- **Inter** is utilized for all UI elements, data tables, and body copy. It is selected for its exceptional legibility at small sizes and its neutral, systematic feel.

For POS applications, **Data-Mono** (Inter with medium weight) is used for receipt previews and order tallies to ensure numerical alignment. Use `headline-sm` for item names in order grids to ensure they are scannable from a distance.

## Layout & Spacing
This design system utilizes a **Fixed-Fluid Hybrid Grid**. On desktop (13" to 24"), the layout is divided into functional zones: a fixed-width sidebar for order summary (right) and a fluid grid for product selection (center).

- **Density:** We employ a **Compact Density** model. The base spacing unit is 4px. Component internal padding is primarily 8px or 12px to maximize the number of visible items on a single screen without requiring scrolling.
- **Grid:** A 12-column system is used within the product area, with 12px gutters. 
- **Touch/Click Accuracy:** Despite the compact nature, all interactive elements must maintain a minimum hit area of 44px to accommodate both mouse precision and touch-screen kiosks.

## Elevation & Depth
Visual hierarchy in the design system is achieved through **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows. This maintains the "Clean Modern" aesthetic.

- **Base Level (0):** Background (#F8F9FA).
- **Surface Level (1):** Primary cards and containers use white (#FFFFFF) with a 1px border (#DEE2E6). No shadow.
- **Active/Raised Level (2):** Modals and dropdowns use a very soft, high-diffusion shadow (8% opacity charcoal, 16px blur) to separate from the background.
- **Feedback:** Pressed states for buttons use an inner-tint (5% black overlay) to simulate a physical "push" without changing the elevation.

## Shapes
The shape language is strictly **Rounded (8px / 0.5rem)**. This radius is applied to all primary UI elements including buttons, input fields, and product cards.

- **Containers:** Large containers like the Order Summary panel use the same 8px radius to maintain consistency.
- **Exceptions:** Notification badges and small status chips may use a "Pill" shape (rounded-full) to differentiate them from actionable buttons.
- **Consistency:** Never mix sharp corners with rounded corners; the 8px rule is the system's geometric signature.

## Components
- **Buttons:** Primary buttons use the Deep Teal background with white text. Secondary buttons use a Charcoal outline. Sizes are "Normal" (40px height) and "Large" (56px height for "Pay" or "Complete Order" actions).
- **Input Fields:** Use a 1px border (#DEE2E6). On focus, the border transitions to the primary teal with a 2px stroke.
- **Product Cards:** These are the most dense components. They include an optional image, item name (Outfit), and price (Inter Bold). The entire card acts as a toggle or "add to cart" action.
- **Solid Iconography:** Icons must be "Solid/Filled" style (e.g., Lucide or Phosphor in Bold weight). This ensures that even on lower-quality POS monitors, the glyphs remain recognizable at 20px.
- **Order Summary List:** Uses Zebra-striping (alternating #FFFFFF and #F8F9FA) for high-speed legibility when reviewing long orders.
- **Numeric Keypad:** Large, flat buttons with Inter Medium typography, optimized for rapid price or quantity entry.