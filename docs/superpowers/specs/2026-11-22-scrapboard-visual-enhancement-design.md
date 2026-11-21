# Scrapboard visual enhancement

## Intent

Give the Scrapboard experience a more polished premium-trading look while keeping the existing workflows, data, printing, and Gold screens unchanged.

## Goals

- Improve Scrapboard-only colors, spacing, card hierarchy, buttons, and readable emphasis.
- Add restrained hover, focus, entry, and loading animations that work on tablet and desktop.
- Preserve fast operation, responsive layouts, accessibility focus states, and thermal receipt output.

## Non-goals

- No changes to Gold styles or Gold behavior.
- No changes to Scrapboard calculations, inventory quantities, pooling, printing, or permissions.
- No large decorative animation, autoplay media, or motion that blocks actions.

## Approach

Use the existing cream/brass foundation and add Scrapboard-scoped premium accents: charcoal surfaces, copper/brass highlights, stronger section hierarchy, softer shadows, and consistent active states. Apply CSS transitions and short keyframes only to Scrapboard containers, cards, buttons, tabs, and status feedback. Respect `prefers-reduced-motion` by disabling nonessential movement.

## Implementation notes

- Scope new selectors under Scrapboard page/container classes so Gold remains unchanged.
- Reuse existing CSS variables and component patterns where possible.
- Add regression checks for Scrapboard markup/classes and reduced-motion rules.

