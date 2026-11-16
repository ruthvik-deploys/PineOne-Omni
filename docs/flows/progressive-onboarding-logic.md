# Progressive onboarding: flow logic (proposal v2, 2026-11-11)

Scope: web `/onboarding-demo`: new merchant → first live product → more products. Also merchants arriving from the old separate platforms.
Main references: **Shopify** (signup intent, Home as onboarding, Home that changes once trading) and **Mercury** (application + "while we review", setup stepper, one coachmark at a time). Razorpay is secondary (verification mechanics).
UI: shadcn components (`.claude/skills/shadcn` rules) with the Pine theme in `app/globals.css` on top.

---

## 0. Problem statement

- In-store, Payment links and Checkout are **separate products**, each with its own onboarding. They used to live on separate platforms. Pine One brings them together **so we can cross-sell**.
- Merchants don't know these products yet.
- Challenges:
  1. **Know what they want** (which product to start).
  2. **Start the right onboarding** (it differs per product).
  3. **Understand the platform**: one account, products side by side, shared money views.
  4. **Understand the products** and get **introduced to more over time** (cross-sell) without being overwhelmed.

---

## 1. Together or separately? One flow, three layers

These aren't separate flows. They're three layers of **one** flow, each with its own job:

| Layer | Job | Decides | Built as |
|---|---|---|---|
| **Intent** | What does this merchant want? | Which product tracks exist and in what order | Signup question + what we already know + behaviour later |
| **Onboarding** | Get each chosen product live | Steps (product-specific) + verification (shared) | One track per product, one shared verification |
| **Education** | Understand platform and products, discover more | When to explain or suggest something | Event-triggered moments on top of the other two, never their own screens |

Why one flow: education is only clear when it's tied to an action ("your first payment is here"). Intent only matters if it changes the onboarding. Why separate layers: each product can change its onboarding without touching intent or education, and a new product only plugs into each layer.

---

## 2. Current flow: what breaks

| # | Break | Layer |
|---|---|---|
| 1 | Signup ends on three product names the merchant has never heard of, all equal, no question asked | Intent |
| 2 | Overview "Get started" → product intro → second "Get started" | Onboarding |
| 3 | Each product re-runs business verification; In-store and the online products use different forms; starting a 2nd online product resets the signed agreement | Onboarding |
| 4 | Nothing to try until full KYC is done | Onboarding / Education |
| 5 | "New in your menu" explains five sections at once, away from the menu | Education |
| 6 | Other products are a static grid, not suggested when relevant | Education (cross-sell) |
| 7 | Overview never changes into a dashboard | Education |
| 8 | Hydration warning in the platform shell | Tech |

---

## 3. Layer 1: Intent (knowing what they want)

> **Recommendation (v3, pending sign-off):** don't ask an intent question by default. Merchants arrive knowing something from the website or a salesperson, so intent is **carried in** (from the source) or **shown by action** (the first product they start). A question is only a fallback ("Help me choose" link), never a gate.
>
> Reading assumption: merchants are willing to read **about the product they came for, at decision points** (what it does, price, what you'll need, how long). They are not willing to read during forms or about the whole platform. So long copy goes on product pages and Overview cards, setup steps stay short, and platform education stays event-triggered (§5).
>
> | Arrival | What they see first |
> |---|---|
> | Website product CTA (`?product=in-store`) | Overview with that product's track open: "You chose In-store. Here's how it works." Product intro is skipped, the first step is ready. |
> | Sales-led (lead carries product, quoted devices) | Same, prefilled: "Your Pine Labs advisor set up an In-store order for 2 × A910. Review it." |
> | Migrated merchant | Their existing products already live, plus a "What's new" walkthrough |
> | No source (organic or direct) | Overview as a browsable catalogue. Product pages are the reading surface. **Starting setup = intent.** "Help me choose" is optional. |
>
> Demo: simulate the source with `?from=website|sales&product=…` on the signup URL.

Signals, used in this order (the signup question below is now only the "Help me choose" fallback):

1. **What we already know.** Signup entry point (came from the In-store page or campaign, sales-rep lead with devices quoted, migrated merchant who already has terminals or links). We preselect it and say so: "You came for In-store, so we'll start there."
2. **What they tell us.** One screen after password (Shopify "What can we help you do?"), in the merchant's words, multi-select:
   - ☐ Customers pay me at my shop or counter → **In-store**
   - ☐ I take orders on WhatsApp or phone and want to send a link → **Payment links**
   - ☐ I sell on my website or app → **Checkout**
   - Business name (optional)
   - **"Not sure, help me choose"** → two yes/no questions (Do customers pay you in person? Do you have a website or app?) → recommendation
   - **"I'll explore first"** → Overview suggests Payment links (no hardware, no website, fastest first payment)
3. **What they do** (later, for cross-sell). Usage signals trigger suggestions (Layer 3).

Output: an ordered list of product tracks. The **primary** is the first one selected (or the one we know). Others are queued, not hidden.

---

## 4. Layer 2: Onboarding (different per product, shared where possible)

Each product's onboarding = **its own steps** + the **verification modules it needs**. Verification is shared: done once, reused.

### 4.1 Product tracks (product-specific)

| Product | Starts with (first useful action, before KYC) | Then | Live when |
|---|---|---|---|
| In-store | Choose devices + plan | Delivery address → pay → shipping → install guide → test payment | Required modules approved + device installed |
| Payment links | Create a **test** link and see the customer view | Link defaults | Required modules approved |
| Checkout | Pick platform (Shopify / WooCommerce / custom) + test keys + sandbox | Brand, go-live checklist | Required modules approved + integration tested |

Rule: **every track starts with the product, not with paperwork.** The merchant does the product's first step and learns what it is by using it. Verification is asked for when it's needed to go live (Shopify: Home first; Mercury: application with a clear "why").

### 4.2 Shared verification (modules)

| Module | Screens (existing) |
|---|---|
| identity | PAN + mobile, GST + address |
| bank | Settlement account |
| owners | Beneficial owners |
| signatory | Signatory, political exposure, identity, Video KYC |
| documents | Business documents |
| online-presence | Website/app or "I don't have one" |
| agreement | One agreement + an addendum per product |

| Product | Requires |
|---|---|
| In-store | identity, bank, signatory, agreement |
| Payment links | identity, bank, owners, signatory, agreement |
| Checkout | + documents, online-presence |

- One data model for all products (`onlineProfile`). In-store's separate business/bank forms go.
- Adding a product shows "Already verified ✓" and asks only for the missing modules. This is also the **cross-sell argument**: the next product is cheap to add.
- Status: `draft → submitted → in review → approved` (simulated in the demo).

### 4.3 Order when several products are chosen

1. Start the **primary** product's first step right away.
2. Verification is a single shared card, worked on once, covering every chosen product.
3. Long lead time goes first: if In-store is chosen, its order can be placed early (ships after approval).

---

## 5. Layer 3: Education (platform, products, cross-sell)

Triggered by events. Each one introduces **one** thing:

| Event | Introduce | Form |
|---|---|---|
| After intent | The platform in one line: "All your products and the money they bring in, in one place." | Header copy on Overview + coachmark on the chosen product's menu item |
| First product step done | What this product does next and how long it takes | The card changes in place (Shopify) |
| Verification submitted | What happens now | Timeline + "while you wait" tasks (Mercury) |
| Product live | **Payments** and **Settlement** appear; they're shared across products | Celebration card + one coachmark on Payments; empty-state explainer on first visit |
| First payments arrive | Overview becomes a dashboard, split by product | Metrics strip + action chips (Shopify Home 3–5) |
| Usage signal | **Another product** (cross-sell) | One suggestion card, in the merchant's situation, stating what's already done |
| Migrated merchant, first login | "Your products are now in one place" | 3-stop coachmark walkthrough, skippable |

Cross-sell triggers (examples, one card at a time, dismissible, not repeated for 30 days):
- In-store live, several large bills → "Take advance payments before customers visit · **Payment links** · Your business is already verified."
- Payment links used often → "Customers order from your website too? **Checkout** puts payment on your site."
- Online only, merchant added a store address → "Selling at a counter too? **In-store** · Same account, same settlement."

Rules: one primary action per page; one coachmark at a time (queued, shown once); situation first, product name second; every waiting state says what's next and when.

---

## 6. Overview: one page, three phases (worked out from state)

| Phase | Layout |
|---|---|
| **Get started** | Greeting + one line on the platform. **Primary product card** big, with its first step and the only dark button. Verification card ("Verify once, used by every product · 2 of 4"). Other chosen products as smaller cards. "More ways to get paid" (small, situation copy) last. |
| **Waiting** | Timeline card (Submitted ✓ → In review ● ~1 working day → Live). "While you wait" tasks. Order tracking for In-store. |
| **Live** | Metrics strip (today's payments, next settlement, by product). Action chips with counts. Setup collapses to "3 of 4 · Next: …" with Hide/Show. One cross-sell card when triggered. |

Menu: products stay **separate entries** (In-store, Payment links, Checkout), shown once chosen or started. "+ Add a product" opens the catalogue. Payments/Settlement appear when the first product is live, with a product filter. Refunds/Disputes/Reports appear when relevant.

---

## 6a. Missing documents and details (the person may not have everything ready)

**Today:** the product intro lists "You'll need" in general terms (same for every business type). The verification rail is strictly linear: a step can't be reached until every earlier step is complete. So one missing document (e.g. MOA) blocks bank, owners and KYC. "Save and exit" exists, but on return there's no list of what's missing.

**Principle:** never block the whole setup on one missing thing. Tell them early, let them skip and come back, let someone else do it, and always show exactly what's left.

| Where | What we do | Reference |
|---|---|---|
| **Before starting** (product page side panel + Overview verification card) | "Have these ready" checklist, **personalised by business type** (worked out from PAN, or one question). Each item has "Where to find it" (e.g. GSTIN on the GST certificate, IFSC on a cheque). Time estimate. "Send me this list" by WhatsApp or email. | Razorpay PAN → type, Mercury follow-up |
| **First verification step** | PAN → fetch legal name, type and linked GSTINs. GST → address. This removes typing and shows them which documents apply. | Razorpay "fetch details", Pine One Business verification section |
| **Inside each module** | "I'll add this later" on anything that doesn't block what comes next. The module is saved as **Pending**, the next module opens. Alternatives offered: account number **or** cancelled cheque, website **or** "I don't have one", upload **or** "scan from phone" (QR handoff, since documents are usually on the phone). | Mercury "Uploading company documents" |
| **Modules someone else must do** | "Ask someone else": send a secure link for one module (e.g. accountant → documents, bank; signatory → identity + Video KYC). Overview shows "Waiting for Rahul (signatory)". | Mercury "Adding a stakeholder", "Inviting a team member" |
| **Rail** | Non-linear: modules can be done in any order. Each shows ✓ Done / ● In progress / ○ Pending / 👤 With someone else. | Mercury application rail |
| **Overview, after leaving** | The verification card lists **what's missing by name** ("2 things left: MOA · Signatory Video KYC"), not "step 5 of 12". One button per item. | Mercury Home setup stepper |
| **Submit** | Only "Review and sign" needs everything required. Meanwhile the product's first step (devices, test link, sandbox) keeps working. | Razorpay test mode |
| **Reminders** | Pending items get a reminder after a day (email/WhatsApp) with a link straight to the missing item. | — |

Documents by business type (illustrative, **to confirm with compliance**):

| Type | Documents |
|---|---|
| Sole proprietor | PAN, GST or Udyam/shop licence, bank proof |
| Partnership / LLP | Firm PAN, partnership deed / LLP agreement, GST, bank proof |
| Private limited | Company PAN, Certificate of incorporation, MOA, AOA, board resolution, GST, bank proof |

Config: each module declares `fields`, `documentsByType`, `canDefer`, `canDelegate`, `whereToFind` per field.

---

## 7. Does the flow make sense? Checks

- **Short signup**: phone → code → password → one intent screen (skippable). Same length as Shopify.
- **Action before paperwork**: each product starts with something real (devices, test link, sandbox). KYC is asked for with a reason.
- **Verified once**: the second product never repeats KYC. This is the core of the "one platform" story.
- **No dead ends while waiting**: Mercury-style timeline + tasks.
- **Gradual**: the menu, Overview and coachmarks change one event at a time.
- **Risks**:
  - Too much copy on Overview. Mitigation: one line plus the cards, nothing more.
  - Cross-sell feeling pushy. Mitigation: triggered by usage, one at a time, 30-day cooldown.

---

## 8. Product config (how it scales)

```ts
type ProductConfig = {
  id; name; situation            // "Send a link on WhatsApp"
  firstStep: Step                // the action before KYC
  steps: Step[]                  // product-specific onboarding
  requires: ModuleId[]           // shared verification
  liveWhen: (state) => boolean
  unlocks: SectionId[]
  teach: Coachmark[]
  crossSell: Array<{ when: (state) => boolean; pitch: string }>
  expectations: { review: string; activation: string }
}
```

---

## 9. Build plan

1. State: `intent` (+ source), modules + verification status, product registry (§8), `phaseOf`, `seenTips`, cross-sell cooldowns. Remove the agreement reset. Move In-store to shared modules.
2. Intent screen after set-password (shadcn `ToggleGroup`/checkbox cards, `Field`, "Not sure" helper).
3. Product tracks start with their first step (test link, sandbox, devices). Remove the double intro.
4. Verification rail shows only required + missing modules, with "Already verified".
5. Overview: three phases (§6), built from shadcn `Card`, `Item`, `Progress`, `Badge`, `Empty`.
6. Coachmark (`Popover` anchored to menu items, queued) + `Empty` explainers + cross-sell card. Retire "New in your menu".
7. Migrated-merchant walkthrough. Fix the hydration warning. Update tests and do a browser walkthrough.
