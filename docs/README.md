# Pine One User Journey Documentation

Last updated: 2026-10-05

This folder documents product and UX decisions captured during iterative demo development.

## Documentation Map

- `docs/design/pine-one-design-document-index.md`
  - Complete platform and module design suite, ownership boundaries and links to all 15 module documents.
- `docs/design/pine-one-platform-design-strategy.md`
  - Platform design strategy: goals, shared decisions, information principles, and web/app behaviour.
- `docs/design/pine-one-user-personas-and-behaviours.md`
  - Canonical WIP reference for role-based personas, task lenses, shared behaviours, evidence gaps and research planning.
- `docs/design/pine-one-login-identity-design-document.md`
  - Unified identity, conditional authentication, business selection and account-mapping design.
- `docs/design/pine-one-roles-permissions-design-document.md`
  - Target access model, custom roles, migration behaviour and web/app administration boundaries.
- `docs/design/pine-one-settlements-design-document.md`
  - Worked module proposal connecting payout clarity and self-service to platform goals, with web/app journeys and validation.
- `docs/design/pine-one-refunds-design-document.md`
  - Refund visibility, initiation, approval, bulk processing, configuration and validation.
- `docs/design/pine-one-module-design-template.md`
  - Module document structure aligned with the supplied design references and parent strategy.
- `docs/flows/pine-one-cross-platform-discovery.md`
  - Consolidated web/mobile discovery findings, prototype-derived answers, capability split, and unresolved cross-platform decisions.
- `docs/architecture/information-architecture.md`
  - IA model, route taxonomy, and page hierarchy across dashboard and auth/onboarding.
- `docs/architecture/v3-information-architecture.md`
  - Shareable V3-only IA reference for stakeholder walkthroughs (navigation, routes, and page hierarchy).
- `docs/architecture/scalability-and-extensibility.md`
  - Current extensibility model and recommended scaling approach for navigation, data, and UI modules.
- `docs/implementation/version-differences.md`
  - Implementation matrix for V1, V2, V3, and V3.1 navigation and behavior differences.
- `docs/implementation/component-boundaries.md`
  - Core component ownership and boundaries for layout, table, analytics, and flows.
- `docs/flows/onboarding-and-auth.md`
  - Login, create-account, OTP, and account onboarding/KYC flow behavior.
- `docs/flows/settlements-v3.md`
  - V3 settlement UX behavior and data model (summary, toggles, batches, detail page).
- `docs/flows/merchant-homepage.md`
  - Merchant homepage decision document: needs-attention taxonomy, business snapshot, and related structural decisions (in progress).
- `docs/decisions/decision-log.md`
  - Consolidated decision log with rationale and implementation impact.
- `docs/implementation/periodic-progress-log.md`
  - Time-ordered implementation updates captured during active iterations.

## Source of Truth

- Navigation versioning and route mapping:
  - `lib/demo-settings.ts`
  - `components/dashboard/v2-sidebar.tsx`
  - `components/dashboard/demo-settings-dialog.tsx`
- Primary shell and layout behavior:
  - `components/dashboard/v2-dashboard-layout.tsx`
  - `components/dashboard/workspace-shell.tsx`
  - `components/ui/panels.tsx`
- Shared table behavior:
  - `components/ui/data-table.tsx`
- Overview and analytics widgets:
  - `components/dashboard/overview-analytics-canvas.tsx`
  - `components/home/home-content.tsx`
- V3 settlements implementation:
  - `components/settlements/v3-settlements-content.tsx`

## Working Rules

- New UX decisions should be added to `docs/decisions/decision-log.md` with date, context, and impact.
- Ongoing implementation progress should be captured in `docs/implementation/periodic-progress-log.md` at meaningful checkpoints.
- If a decision changes IA or version behavior, also update:
  - `information-architecture.md`
  - `version-differences.md`
- If a decision changes shared primitives, update `component-boundaries.md`.
