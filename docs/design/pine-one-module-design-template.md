# Pine One Module Design Document Template

Use this structure for each module or substantial journey. Replace prompts with concise reasoning and evidence. Keep shared business rules in the module document and explain app and web variations alongside them. Link the parent strategy rather than copying its full content.

## Overview

State which user outcome the module improves, why it matters and what design direction is proposed. Identify the parent platform goals using G1–G5. Record the owner, scope, review status, launch milestone and relevant design links; leave unknowns open.

Explain which shared platform rules apply and whether this module proposes an exception. A prototype capability does not by itself establish release scope.

## User and behaviour references

Reference the relevant P persona, T task-lens and B behaviour IDs from the Pine One User Personas and Behaviour Reference. State which persona is primary, which task lens applies and which behaviours directly affect the information order or interaction.

Cite the relevant R research ID and source section from the canonical register when evidence affects the module, for example P4, B16, R05 EMI Reporting Issues for export compatibility. Add a short Research implications section explaining what changes in this module and what remains untested. Keep merchant profiles and general findings in the persona document.

Do not repeat the shared persona description. Add local detail only when this module changes the person's goal, risk, information need or behaviour. Explain relevant channel, store, permission and device conditions as context dimensions rather than creating a new persona. Label any new module-specific behaviour as observed, reported or hypothetical and add the research source and date for observed findings.

Preserve stable IDs and distinguish reported workflows, prototype observations, proposed interventions and measured outcomes. Do not infer mobile preference, owner usage, channel-tab comprehension or a release commitment from a study that did not test it. Retain missing visit dates as unknown.

## Problem and motivation

Describe the current journey and the specific point where users lose time, make an error or become uncertain. Explain the consequence for the user and the business. Support the claim with observation, analytics, support evidence or a clearly labelled hypothesis.

Current journey: Trigger → entry → steps → difficulty → outcome or workaround.

Distinguish a service problem from an information problem. For example, explaining a payout delay may reduce uncertainty but will not itself accelerate the payout.

## Goals and success measures

For each local goal, show its connection to the parent strategy and define success in observable terms. Include the denominator, time window, baseline, proposed target and owner where known.

| Local goal | User outcome and measure | Parent goal |
|---|---|---|
| Add the module outcome | Define a successful task or correct understanding | G1–G5 |
| Add any adoption outcome | Define activation and meaningful subsequent use | G3 or G4 |

Record guardrails, including errors, unresolved issues and access to help where relevant. Separate app and web results and segment channel and role. Do not equate more clicks or longer sessions with improved engagement. Mark unmeasured baselines and targets as pending.

## Requirements

Number requirements so designs and review comments can refer to them. Define what each priority means for this module and whether prioritisation is proposed or agreed.

| User story | Comments | Priority |
|---|---|---|
| M1 As a role, when a situation occurs, I need an outcome | Scope, inherited rule, evidence or constraint | Proposed priority |
| M2 Add the next user need | Relevant channel or permission condition | Proposed priority |

### Out of scope

Number relevant exclusions and identify where they will be handled. Distinguish a deliberately deferred capability from an unresolved decision.

## Mental model and design principles

Explain what the user believes is happening, where that understanding conflicts with the current experience and which design principle addresses the gap. Choose principles specific to the module; explain why each changes the proposed solution.

Reasoning chain: User situation → uncertainty or difficulty → design response → expected change in behaviour → success measure.

## Proposed solution and design

### User journey

Describe the trigger, entry, critical decisions, confirmation, completion and recovery. Link every significant step to a requirement. Include direct entry and entry from Overview if the context differs.

### Design decisions and details

For each significant decision, record the current behaviour, proposed change, user rationale, evidence status, expected outcome and tradeoff. Include a realistic example where it makes the rule clearer. Label the decision as stated direction, proposal, agreed decision or open question.

### Mockups and annotations

Link actual design frames or prototype destinations. Annotate what the user sees, understands and can do, including feedback after action. Connect annotations to requirement IDs and hypotheses. Record missing frames as design work, not completed evidence.

### Shared rules and states

Define business, channel, store, date and permission scope. Include applicable first-use, no-activity, filtered-empty, loading, stale-data, error, partial-success and completion states. Explain recovery and what happens on return. Only include states relevant to this module.

### App behaviour

Explain the mobile task context, first-view information, primary action, deeper detail, interruption handling and supported recovery. State any exclusions and the user-facing next step. Do not assume offline support or push-notification behaviour without a design decision.

### Web behaviour

Explain the desktop task context, information density, comparison needs, filtering, details, exports and bulk or configuration tasks where applicable. State return behaviour and keyboard interaction requirements relevant to the journey.

### Continuity across web and app

Specify shared terms, records, status meaning and permissions. State what a supported link restores and whether drafts or filters actually carry across devices. Explain any intentional variation and the reason for it.

### Pros and cons

Record material benefits and tradeoffs. Explain the mitigation and the observation or result that would cause the team to reconsider a decision.

### Dependencies and constraints

List only dependencies that affect the user's experience: data availability, timing, permissions, third-party steps or support handoff. State the user-visible fallback when a dependency fails. Include security, availability or performance implications only where relevant to the proposed behaviour.

## Hypotheses and validation

Write hypotheses as a design change, expected user effect and measurable result. Identify evidence needed before numerical targets are approved. Describe the tasks, participant roles, channel configurations and app/web coverage required to test the proposal.

After release, evaluate the intended outcome and guardrails together. Record what would count as a failed hypothesis and which design choice would be revisited.

## Open questions FAQ

Ask questions that change the solution, identify the decision owner where known and state what evidence would resolve each one. Keep answered questions out of the open list and reflect the answer in the relevant decision.

## Alternatives considered

Describe credible alternatives, why they could work, their tradeoffs and why the current proposal is preferred. Distinguish a reasoned design choice from a tested result. Keep competing options open when a decision has not been made.

## Appendix and references

Link the parent strategy, persona and behaviour reference, research, analytics, support analysis, current prototype and final designs. Retain a short decision history with date, status, rationale and affected platform rule. Put detailed field inventories here or in a linked specification so the main document remains a readable design argument.
