# Design System Strategy: The Monolithic Terminal

## 1. Overview & Creative North Star
**Creative North Star: The Intellectual Engine**

This design system is an evolution of the terminal aesthetic—moving away from "retro-computing" and toward a high-fidelity, editorial experience for professional cognition. It is built to feel like a high-end IDE or a bespoke research tool. We break the "template" look by eschewing standard card-based layouts in favor of **Monolithic Layouts**: large, structural blocks of deep charcoal separated by strict, purposeful negative space rather than decorative lines.

The system relies on **Intentional Asymmetry**. To avoid a rigid, boxed-in feel, use wide margins for primary content and tight, technical sidebars for metadata. The goal is to create an environment where the interface recedes, leaving only the user's focus and the "glow" of the data.

---

## 2. Colors & Surface Philosophy
The palette is rooted in the depth of `surface` (#131313) and the warmth of the `primary` peach (#D97757).

*   **The "No-Line" Rule:** We do not use 1px solid borders to section off major layout areas. Instead, define boundaries through background shifts. A sidebar should use `surface_container_low` (#1C1B1B) against a main content area of `surface` (#131313). This creates a "milled" look, as if the interface was carved from a single block of charcoal.
*   **Surface Hierarchy & Nesting:** 
    *   **Level 0 (Base):** `surface_container_lowest` (#0E0E0E) for deep backgrounds.
    *   **Level 1 (Panels):** `surface` (#131313) for primary workspace areas.
    *   **Level 2 (Inlays):** `surface_container` (#201F1F) for interactive elements like code blocks or input fields.
*   **The "Glass & Gradient" Rule:** While the aesthetic is "flat," we inject soul into high-traffic areas. Apply a 15% opacity `primary` gradient to `surface_container_highest` for active states. For floating command palettes, use `surface_bright` with a 12px `backdrop-blur` to allow the terminal text beneath to bleed through softly.
*   **Signature Textures:** Use a subtle grain overlay (2% opacity) on `surface` levels to mimic the tactile feel of high-end paper or a matte monitor finish.

---

## 3. Typography: The Monospaced Editorial
We treat monospaced type not as a "code-only" utility, but as a sophisticated editorial choice.

*   **Display & Headline (`Space Grotesk`):** We use Space Grotesk for its geometric, tech-leaning proportions. It provides a humanistic counterpoint to the rigid terminal feel. Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) for a bold, authoritative presence.
*   **Body & Technical (`Inter` / Monospaced Fallback):** While `Inter` is the primary body face for legibility, all "meta-data," labels, and data-heavy strings must use a high-quality mono font (JetBrains Mono).
*   **Hierarchy as Brand:** Use `label-sm` (0.6875rem) in all-caps with 0.1em letter-spacing for section headers. This mimics the "header" of a terminal process, signaling a professional, high-fidelity environment.

---

## 4. Elevation & Depth
In this system, "up" is signaled by light, not shadow.

*   **The Layering Principle:** Depth is achieved by stacking. A `surface_container_high` (#2A2A2A) element sitting on a `surface` background creates a natural, soft lift.
*   **Ambient Shadows:** We strictly avoid heavy "Drop Shadows." If a floating element (like a dropdown) requires separation, use a shadow with a 32px blur at 6% opacity, using the `on_surface` color as the shadow tint. This mimics the ambient occlusion of a screen's backlight.
*   **The "Ghost Border" Fallback:** For buttons or input fields that require a boundary, use a "Ghost Border": `outline_variant` (#55433D) at 20% opacity. It should feel like a suggestion of a container, not a cage.
*   **Glassmorphism:** Use for "Overlays." When a modal appears, the background isn't just dimmed; it is blurred (8px) and tinted with `surface_dim` at 80% opacity, maintaining the "monolithic" continuity.

---

## 5. Components

*   **Buttons:**
    *   *Primary:* Solid `primary_container` (#D97757) with `on_primary_container` (#541400) text. Corner radius: `DEFAULT` (4px). No shadow.
    *   *Secondary:* `surface_container_highest` background with a 1px `outline_variant` ghost border.
*   **Inputs:** 
    *   Background: `surface_container_lowest`. 
    *   Active State: Change border from `outline_variant` (20%) to `primary` (100%). Use a 2px "focus glow" using the `primary` color at 10% opacity.
*   **Chips:** 
    *   Use for status or tags. `surface_container_high` background. Text in `on_surface_variant`. Avoid rounded "pill" shapes; use `sm` (2px) radius for a more technical, "tab" feel.
*   **Cards & Lists:** 
    *   **Forbid Dividers.** Separation is achieved through `1.5` (0.3rem) to `4` (0.9rem) spacing increments. Use a `surface_container_low` background shift on hover to indicate interactivity.
*   **Terminal Traces (New Component):**
    *   A thin, vertical 2px line of `primary` color used only on the far left of an "Active" section or "Focused" list item. This mimics the cursor in a command line.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use `primary` (#D97757) sparingly. It is a "laser pointer," meant to draw the eye to exactly one action or status.
*   **Do** embrace wide, empty gutters. High-fidelity systems feel premium because they aren't afraid to "waste" space to achieve clarity.
*   **Do** align everything to a strict 4px baseline grid to maintain the structural integrity of a terminal.

### Don't:
*   **Don't** use pure black (#000000). It kills the "ink" depth of the charcoal layers.
*   **Don't** use standard 1px borders for every card. It creates visual noise and "boxiness" that feels cheap.
*   **Don't** use large corner radiuses. Anything over 8px (`lg`) breaks the technical, precise atmosphere of the system.