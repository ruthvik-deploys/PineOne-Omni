# Pine One mobile app: design rules

The owner's decisions, current as of 18 Nov 2026. Follow them unless the owner says otherwise for a specific task. When a Figma frame is given and the owner says "exactly", the frame wins over these rules: pull real specs for every component, including chrome (nav bar, sheets, headers), and compare side by side before calling it done.

Source of truth for layout is the Figma file "PineOne - Omni-channel" (`yho7fEuaRxxJXCkR1dIRHY`), App pages: Home & Payments `7132:120094`, Settlement `7161:77755`, Support `7228:156164`, Home `7154:141243`.

## Layout experiments
Switches live in `src/constants/experiments.ts`. `APP_PAGE_LAYOUT` (on) is the current direction, and the other layouts are kept behind their switches. New experiments follow the same pattern: see "Make a version or experiment" in the root `AGENTS.md`.

## Pages
- **New pages copy the structure of existing app-layout pages** (Settlement preferences, Support landing, listing pages), not fresh layouts or older pages like Checkout. Put an existing reference page's screenshot next to the new one before reporting.
- Cards sit 8dp from the screen edges and 8dp apart (`PAGE_PADDING` / `PAGE_GAP` in `tab-screen.tsx`).
- **Tab pages** (Overview, Payments, Settlement, the 4th module slot) use `TabScreen` + `AppHeader`:
  - Overview: the name and role badge on the left, the initials avatar on the right (unread badge, opens the profile). No bell.
  - Other tabs: the page name, the scope line ("All channels • Store ›") that opens the switcher, and the page's main action on the right.
- **Inner pages** (anything below a tab or module root) use `DetailScreen`:
  - Back plus the main action in the top bar;
  - no bottom nav bar, no subtitle;
  - main calls to action in the fixed bottom footer (`footer` prop, buttons `flex: 1`, primary last).
  - The first block needs `marginTop: PAGE_PADDING`.
- **Every page opened from the profile** is an inner page with no bottom nav bar. It slides in from the right over the profile, and Back returns to the profile.
- "See more" is an explicit button ("View all payments" as the last row in the list card, or "View all" beside a title). Section titles are never links.

## Navigation
- Bottom bar: full width, flush to the bottom, white, no border.
  - Items: Overview, Payments, Settlement, a 4th slot, then More.
  - The slot holds the last-opened of Support / Refunds / Disputes / MDR reports. Expanded More shows the other three, over a very light dark tint behind the bar.
  - Keep the slot replacement even if a design shows a fixed 4th item.
- New modules go in `BAR_MODULES` / `MODULE_TABS` in `components/app-tabs.tsx`.

## Scope (stores, channel, organisation)
- Store and channel are **global**. Only the header switcher changes them. Pages never get their own store picker or In-store/Online toggle; read `useBusiness()`.
- "All channels" exists only on Overview. Payments, Settlements, Refunds, Disputes and Reports are In-store **or** Online. Stores only apply to In-store. All stores is the default.
- The organisation isn't in the switcher. It's switched from the profile / Business profile and reloads the app to Overview (`switchOrganisation`).

## Cards and surfaces
- White cards, tiles and bars on the grey page have **no border** (`Card mode="contained"`, `backgroundColor: theme.colors.surface`). Controls (inputs, pills, outlined buttons) keep theirs.
- Separators are 1dp in `theme.colors.background` via `shared/divider.tsx`, not Paper's Divider.
- Feature/option cards use the preferences card: white, `Shape.max`, padding 12, an icon row with the state at the end, then a 16 semibold title and a 14 muted line.

## Listings
- One format: date pill → one summary card per number → the records card (search + Filters, grey day bands, 76dp rows).
- Row: round icon tile → heading → one line of sub text → status badge on the right. Nothing else in the row. The rest goes in the detail sheet or page.
- When a record needs one more fact, the right column is a `StatusStack` (`shared/listing.tsx`): the badge, then the fact 8dp below, in red when it needs attention.
- Badges match the web: fully rounded, 1px border, 12px text. Payment statuses use the dot badge.
- No suggestion chips on listings. No ⋮ row menus: tapping opens a sheet with the key actions in its sticky footer.
- Numbers use open digits (`OPEN_DIGITS` / `NUMERIC` in `constants/theme.ts`).

## Bottom sheets
- Every sheet looks like the channel switcher: white header (muted title, outlined ✕), grey body, content in white rounded cards with an uppercase label above each, and a full-width 48dp primary button in the footer.
- Build them from `components/shared/panel-sheet.tsx` (`PanelSheet`, `PanelSection`, `SheetSection`, `SheetRow`, `SHEET_BUTTON`) and `shared/sheet-parts.tsx`.
- Sheets are edge to edge, with only the top corners rounded (18dp). `PanelSheet` handles the home-indicator padding.
- Size to content with `fit`. Don't hard-code a height.
- Long choice lists use one row per facet with its value ("Status · Success ›"), which opens a nested picker sheet.

## Theme
- Light and dark exist. App colours come from `useAppColors()` (`constants/app-colors.ts`); never hard-code light hex values.
- Anything drawn over the shell's page layer (toasts, overlays) needs `zIndex` ≥ 3.

## Product decisions to respect
- **Pending dues / Invoices:** payments are bulk, so never link a payment to an invoice. Invoice rows show amount, number, status, due date and download, with no icon.
- **Business profile** (Figma `7961:21505`): a hero, then 5 cards (Business details, KYC & documents, Bank accounts, Paymodes, Registered details). A paymode change is a request with a ticket. A bank edit goes through ₹1 verification and then updates immediately.
- **Value Added Services:** three statuses (Enabled / In processing / Not enabled) and a lean details sheet. An open request shows as a banner on its service card, never in a separate list.
