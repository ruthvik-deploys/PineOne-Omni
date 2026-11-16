# Pine One Design Document Index

Updated: 5 October 2026

The platform strategy owns shared goals and decisions. The WIP persona and behaviour reference owns role descriptions, recurring behaviours, research sources and evidence limits. Module documents explain their local problem, proposed response, app/web variation and validation without duplicating merchant profiles.

## Platform and research

- [Platform strategy](pine-one-platform-design-strategy.md)
- [User personas and behaviour reference](pine-one-user-personas-and-behaviours.md)
- [Module authoring template](pine-one-module-design-template.md)

## Identity and administration

- [Login and Identity](pine-one-login-identity-design-document.md)
- [Roles and Permissions](pine-one-roles-permissions-design-document.md)
- [Account Settings](pine-one-account-settings-design-document.md)

## Merchant operations

- [Overview](pine-one-overview-design-document.md)
- [Transactions](pine-one-transactions-design-document.md)
- [Settlements](pine-one-settlements-design-document.md)
- [Refunds](pine-one-refunds-design-document.md)
- [Disputes](pine-one-disputes-design-document.md)
- [Reports](pine-one-reports-design-document.md)
- [Help and Support](pine-one-support-design-document.md)

## Product management

- [Devices](pine-one-devices-design-document.md)
- [Stores](pine-one-stores-design-document.md)
- [Payment Links](pine-one-payment-links-design-document.md)
- [Checkout](pine-one-checkout-design-document.md)
- [Online Payment Configuration](pine-one-online-configuration-design-document.md)

## Ownership boundaries and review

Devices owns hardware actions; Stores owns location context and associations. Roles and Permissions owns grants and membership changes. Reports owns export schemas, jobs and delivery; operational modules can enter a request with explicit scope. Checkout owns the merchant visual editor; Online Payment Configuration owns integration readiness and controls. Support owns case continuity, not the underlying financial action.

The new module documents are proposals, not changes to the prototype or release scope. P/B/T/R references resolve through the canonical persona document. Requirement prefixes are unique by module: OV, TX, DP, RP, DV, ST, PL, CK, OC, AS and HS. Baselines, numerical targets, design-frame sign-off and unknown product rules remain open for review.

Onboarding/KYC and future coming-soon products are deliberately excluded. In-store payment-mode and paid-capability controls are covered within Devices and the existing Settlements document where relevant; a standalone configuration document may be added when its approved scope is distinct. Analytics remains within Overview/Transactions rather than becoming an unscoped new module.

Word exports are maintained in docs/exports/omni-design-suite. The Markdown sources remain the editable design record. No app or web behaviour changes are implemented by these documents.

## Roadmap items requiring separate scoping

The supplied Omni Channel Experience product strategy also names Subscriptions/PRIME and Agents Copilot. Subscriptions appears in both the Phase 1 online-settings scope and Phase 2 planning; its initial release boundary needs clarification. Copilot names chat, agent configuration and audit capabilities, but a merchant journey, authority model and validation basis are not yet established in this suite. Neither is silently included in Checkout or Online Payment Configuration.

PA-CB, partner dashboard, offers, eChallan, GrowthX and Setu require their own agreed scope before detailed module documents are written. This index distinguishes the current merchant-facing module drafts from the wider roadmap; it does not imply that these roadmap capabilities are cancelled or fully documented. Unified onboarding/KYC remains deferred at the user's request.

## New Word documents

- [Overview](../exports/omni-design-suite/Pine%20One%20Overview%20Design%20Document.docx)
- [Transactions](../exports/omni-design-suite/Pine%20One%20Transactions%20Design%20Document.docx)
- [Disputes](../exports/omni-design-suite/Pine%20One%20Disputes%20Design%20Document.docx)
- [Reports](../exports/omni-design-suite/Pine%20One%20Reports%20Design%20Document.docx)
- [Devices](../exports/omni-design-suite/Pine%20One%20Devices%20Design%20Document.docx)
- [Stores](../exports/omni-design-suite/Pine%20One%20Stores%20Design%20Document.docx)
- [Payment Links](../exports/omni-design-suite/Pine%20One%20Payment%20Links%20Design%20Document.docx)
- [Checkout](../exports/omni-design-suite/Pine%20One%20Checkout%20Design%20Document.docx)
- [Online Payment Configuration](../exports/omni-design-suite/Pine%20One%20Online%20Payment%20Configuration%20Design%20Document.docx)
- [Account Settings](../exports/omni-design-suite/Pine%20One%20Account%20Settings%20Design%20Document.docx)
- [Help and Support](../exports/omni-design-suite/Pine%20One%20Help%20and%20Support%20Design%20Document.docx)
