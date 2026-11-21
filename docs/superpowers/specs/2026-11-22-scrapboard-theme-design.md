# Scrapboard Theme Refresh Design

## Intent

Refresh the Scrapboard Trading visual system so the main pages and login page feel calm, consistent, and easier to read. Replace the current mixed sage/cream/gold/charcoal treatment with a soft slate-blue and ivory palette, while retaining the existing business behavior and receipt-print styling.

## Goals

- Provide a cohesive light theme using soft ivory surfaces, slate-blue accents, and restrained contrast.
- Provide a matching dark theme with comfortable contrast and no harsh bright colors.
- Add a visible light/dark mode toggle on the login screen and authenticated shell.
- Persist the user's choice in browser storage, with system preference as the fallback.
- Restyle shared navigation, page headers, cards, forms, tables, dashboard panels, buying flow, inventory, rates, sales, and account pages.
- Keep semantic colors for success, warning, danger, and cash-in/cash-out readable.
- Preserve the existing receipt preview/print appearance and all business logic.

## Non-goals

- No changes to Gold Trading or any other project.
- No changes to database schemas, calculations, authentication rules, RawBT integration, or Bluetooth behavior.
- No removal of existing page features or data.

## Constraints

- Existing Scrapboard styling is primarily in `public/index.html`; app rendering and shell behavior are in `public/app.ts` with the generated `public/app.js` bundle.
- Theme state must work before login and after login.
- Mobile/tablet layouts must remain responsive.
- Print styles must stay black-and-white/thermal-friendly.

## Approaches considered

1. **Slate-blue + soft ivory theme tokens (chosen).** Centralize the palette as CSS variables, switch variables with `data-theme`, and add one shared toggle behavior. This gives consistent restyling across the existing pages without rewriting their markup.
2. **Two separate page-specific themes.** Restyle each route independently. This would require duplicated colors and would make future fixes inconsistent, so it does not fit the request for one comfortable visual system.
3. **Component/library migration.** Replace the current styling with a UI framework. This is too risky for the existing inline-rendered app and could disturb receipt, form, and responsive behavior.

## Design decisions

- Use `data-theme="light|dark"` on the document root so the login screen and authenticated app switch together.
- Use a local-storage preference key with `prefers-color-scheme` fallback.
- Add toggle controls with accessible labels and state text; update all visible toggles together.
- Define light/dark tokens once, then override existing Scrapboard-scoped selectors for legacy gold/charcoal panels.
- Keep semantic status colors distinct from the neutral theme palette.
- Keep print/thermal receipt selectors outside the theme overrides.

## Implementation outline

1. Add failing tests for theme controls, persistence/fallback behavior, and Scrapboard-scoped visual tokens.
2. Add theme tokens and component overrides in `public/index.html`.
3. Add theme initialization, toggle behavior, and controls in `public/app.ts`; update the generated bundle.
4. Run focused tests, the complete test suite, and a production build check.
5. Review responsive selectors and ensure receipt print styles are unchanged.

