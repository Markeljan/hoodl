# HOODL roadmap and engineering plan

**Canonical forward plan:** this document is the living source of truth for priorities, TODOs, sequencing, acceptance criteria, and iteration history. `MASTER.md` remains the product/positioning reference, `FEATURE_PARITY.md` remains the completed contract-parity record, and deployment JSON files remain the source of truth for addresses and mainnet configuration.

**Baseline date:** 2026-07-16
**30-day checkpoint:** 2026-08-15
**Owner:** HOODL team
**Update rule:** update task status and the iteration log in the same change that implements or validates a roadmap item. Never mark an external launch, live transaction, ownership transfer, application, or metric complete without linked evidence.

## Status model

- `DONE`: implemented and verified; evidence is recorded.
- `IN PROGRESS`: actively being implemented; current branch/work is named in the iteration log.
- `NEXT`: one of the highest-priority unblocked items.
- `TODO`: scoped, but not yet selected.
- `BLOCKED`: cannot proceed; the exact decision or external dependency is recorded.
- `DEFERRED`: intentionally outside the current milestone.

Checkboxes reflect completion only: checked means `DONE`; unchecked means every other status. Keep task IDs stable so commits, issues, applications, and analytics can refer to them.

## North star

Prove that people who are not the deployer can discover, buy or mint, hold, and redeem a HOODL index on Robinhood Chain—and that external creators can launch an index without HOODL becoming its custodian or manager.

The immediate loop is:

1. An eligible user discovers an index from a shareable page.
2. They connect a supported wallet and understand how to fund it.
3. They complete a small buy or mint with clearly disclosed cost and backing.
4. They can independently redeem or sell.
5. They return, share the index, or create one.

Feature work should either shorten this loop, make it safer, or produce evidence that helps distribution and grants. Work that does none of those is not a current priority.

## Token identities: never blur these

| Name | What it is | Backing / exit | Primary job | Required language |
|---|---|---|---|---|
| **HOODL** | The product, protocol, app, and project at `hoodl.finance` | Not an asset | Permissionless index infrastructure | “HOODL protocol/app/project” |
| **hAI** | A deployed index token containing fixed units of NVDA, TSLA, and CASHCAT | Fully backed; in-kind redeemable under the deployed index contract | Flagship RWA + crypto credibility product | “hAI index token”; never imply `$HOODL` backing |
| **hMEME** | A deployed index token containing fixed units of five Robinhood Chain memecoins | Fully backed; in-kind redeemable under the deployed index contract | Attention and user-acquisition wedge | “hMEME index token”; never call it the protocol token |
| **`$HOODL`** | A proposed, distinct community/curation token; not deployed at this baseline | **Not** backed by hAI, hMEME, protocol reserves, or an index basket unless a later, reviewed design explicitly changes this | Community identity, curation, campaigns, and ecosystem participation | Always say “`$HOODL` community token”; never call it an index, fund, share of revenue, or claim on treasury assets |

Before `$HOODL` deployment, its final name/symbol collision risk, utility, supply, allocations, vesting, liquidity plan, admin powers, disclosures, and legal posture must be written down and approved. “Launch soon” means a tightly scoped and transparent launch, not skipping these gates.

## Baseline: what is already shipped

The roadmap starts from the current repository, not from the pre-launch pitch backlog.

- [x] **BASE-001 — Deploy and verify the core protocol on Robinhood Chain mainnet.**
  **Status:** `DONE`
  **Evidence:** `deployments/robinhood-mainnet.json` records IndexFactory, IndexLens, IndexZap, hAI, hMEME, transaction hashes, verification flags, and chain ID 4663.
  **Acceptance:** Canonical deployment records contain verified explorer URLs and match frontend addresses.
  **Dependencies:** None.

- [x] **BASE-002 — Ship core index lifecycle and periphery coverage.**
  **Status:** `DONE`
  **Evidence:** `src/IndexToken.sol`, `src/IndexFactory.sol`, `src/periphery/IndexLens.sol`, `src/periphery/IndexZap.sol`; `FEATURE_PARITY.md` records 60 passing default Foundry tests and three gated fork tests.
  **Acceptance:** Create, in-kind mint/redeem, NAV, USDG zap-in, and USDG zap-out are implemented and tested.
  **Dependencies:** BASE-001.

- [x] **BASE-003 — Ship multi-index consumer and creator web surfaces.**
  **Status:** `DONE`
  **Evidence:** `FEATURE_PARITY.md`; `web/src/components/{Discover,Detail,Portfolio,CreateIndex,Creator,Activity,Operator}.tsx`; `web/src/useHoodl.ts`.
  **Acceptance:** Discovery, shareable details, buy/mint/redeem/sell, portfolio, transfer, creation, creator management, activity, and role-gated operator controls compile and are represented in the app.
  **Dependencies:** BASE-001, BASE-002.

- [x] **BASE-004 — Configure hMEME NAV and USDG component routes.**
  **Status:** `DONE`
  **Evidence:** `deployments/robinhood-meme-index.json`, `deployments/robinhood-mainnet.json`, `web/scripts/configure-meme-index-periphery.ts`, and `web/tests/hmeme-pools.test.ts`.
  **Acceptance:** Every hMEME component has a recorded Lens source and Zap route, with PoolKeys verified by tests.
  **Dependencies:** BASE-001.

- [x] **BASE-005 — Add basic production analytics and social/share metadata.**
  **Status:** `DONE`
  **Evidence:** `@vercel/analytics` and `@vercel/speed-insights` in `web/package.json`; event calls in `web/src/App.tsx`; URL routing and metadata modules in `web/src`.
  **Acceptance:** Production can record basic screen/action events and generate shareable index URLs.
  **Dependencies:** BASE-003.

### Known baseline gaps

- Wallet access is injected-provider only; WalletConnect/mobile connection is not implemented.
- Action analytics now include privacy-safe per-index action outcomes and normalized failure stages/reasons, but still need wallet type, acquisition source, amount buckets, approval/submission stages, and a production KPI query.
- The deployment record assigns Factory, Lens, Zap, treasury, and both creator roles to the deployer EOA; no Safe migration is recorded.
- No independent security review, audit, public security page, monitoring runbook, or bug bounty is recorded.
- A live direct hMEME/USDG or hAI/USDG market is not documented in the canonical deployment records. Scripts/fork proofs are not evidence of mainnet liquidity.
- The create flow supports raw component addresses/units, but does not yet provide a curated token picker, percentage/equal-dollar construction, or automated periphery-readiness checks.
- Stock-token eligibility and regional restrictions need reviewed product handling before broad hAI acquisition campaigns.
- The first reproducible holder/supply/direct-market snapshot is available through `cd web && bun run snapshot:growth`; registry, event, AUM, conversion, and failure-rate baselines still need coverage.

### Live growth baseline captured 2026-07-16

| Token | Reported holders | Total supply | Direct DexScreener pairs |
|---|---:|---:|---:|
| hAI | 1 | 0.000063495876720665 | 0 |
| hMEME | 1 | 0.182586228464392559 | 0 |

Reproduce this point-in-time data with `cd web && bun run snapshot:growth`. Holder counts do not yet exclude team-controlled addresses; the command intentionally reports upstream facts without guessing ownership.

## 30-day outcomes and KPIs

These are product outcomes, not vanity metrics. “External” excludes the deployer, treasury, contracts, LP custody, test wallets controlled by the team, and duplicate wallets known to belong to the same person.

| KPI | Baseline action | Target by 2026-08-15 | Definition / evidence |
|---|---|---:|---|
| External index holders | Capture at launch-readiness checkpoint | **100** | Unique externally controlled addresses with nonzero hAI, hMEME, or creator-index balance; reproducible chain query |
| Successful acquisition actions | Capture current count | **100** | Confirmed external zap-mints, direct mints, or direct-market buys; deduplicate retries and team wallets |
| Successful exit actions | Capture current count | **10+** | Confirmed external in-kind redemptions, zap-redemptions, or direct-market sells |
| External creators | Capture current count | **3** | Distinct external creator addresses that complete a launch with reviewed metadata |
| External creator indexes | Capture current count | **3** | Factory-created external indexes with valid metadata and at least one non-creator holder |
| Fully backed index supply | Capture live NAV/supply | **$10,000+** | Sum of live priced index supply; label unpriced indexes separately and record query timestamp |
| Post-connect transaction failure | Add dimensional instrumentation | **<5%** | Failed submitted actions / all submitted actions, excluding explicit user rejection; segmented by action and wallet |
| User interviews | Begin a research log with no sensitive wallet mapping | **10** | Dated notes with role, observed friction, and next decision; no private keys or unnecessary personal data |
| Direct index market | Verify none before creating | **1+** | Live index/USDG pool with explorer/DEX link, visible reserves, documented LP owner/lock, and a successful external round trip |
| `$HOODL` product conversion | Establish at launch | **20%+** | Percentage of participating `$HOODL` wallets that later complete an index action; report methodology and caveats |

## Current priority order

1. **P0 — Launch readiness and measurement:** trustworthy baselines, action funnel, mobile QA, risk copy, and runbooks.
2. **P0 — hMEME distribution:** a canonical acquisition page, direct market if technically/economically sound, first-user onboarding, and feedback.
3. **P0 — `$HOODL` launch:** transparent token design and distribution event that feeds index usage.
4. **P1 — Creator loop:** turn permissionless infrastructure into an approachable launch product for three external creators.
5. **P1 — Security and reliability:** Safe ownership, review/audit readiness, monitoring, incident response, and disclosure.
6. **P1 — Grants and accelerators:** package live evidence into reusable applications and targeted outreach.
7. **P2 — Later composability:** only after the acquisition/exit loop works reliably.

## Phase 0 — Launch readiness and measurement

**Exit condition:** We can reproduce live product baselines, distinguish each funnel step and failure class, complete a small mobile lifecycle, and send a user to an accurate funding/risk guide.

- [ ] **LR-001 — Capture a reproducible live baseline snapshot.**
  **Status:** `IN PROGRESS`
  **Scope:** Add a read-only Bun/TypeScript script or documented query that records registry indexes, supply, holders where the explorer API supports it, recent lifecycle events, NAV capability, Zap capability, and direct index/USDG market evidence. Never place secrets in the output.
  **Current evidence:** `web/scripts/growth-snapshot.ts`, `web/tests/growth-snapshot.test.ts`, and `cd web && bun run snapshot:growth` now capture hAI/hMEME holders, raw supply, decimals, and direct DexScreener pair counts. Registry, lifecycle events, AUM, and capability coverage remain.
  **Evidence required:** Timestamped output or checked-in non-sensitive snapshot plus exact command; explorer/API links for facts not derivable from RPC.
  **Acceptance:** Another contributor can rerun one documented command and reconcile every 30-day KPI baseline; unknown values are labeled unknown, not guessed.
  **Dependencies:** BASE-001 through BASE-004; public RPC/explorer availability.

- [ ] **LR-002 — Instrument the complete acquisition and exit funnel.**
  **Status:** `IN PROGRESS`
  **Scope:** Track discovery source, index, action, wallet type, connection/network state, quote requested/succeeded, approval requested/confirmed, transaction submitted/confirmed, normalized failure class, and non-sensitive amount buckets. Never send full wallet addresses or sensitive provider errors to analytics.
  **Current evidence:** `web/src/analytics.ts`, `web/tests/analytics.test.ts`, and `web/src/App.tsx` provide typed privacy-safe action context, success state, failure stage/reason, index identifiers, input/quote/clipboard outcomes, and transaction success. Wallet type, discovery source, amount buckets, approval/submission stages, production debug evidence, and the KPI query note remain.
  **Evidence required:** Typed event schema, unit tests for normalization, analytics debug screenshots/logs, and a KPI query note.
  **Acceptance:** A launch report can show discover → connect → quote → submit → confirm conversion by index/action and calculate the failure KPI without using generic “Protocol Action Completed/Failed” counts.
  **Dependencies:** BASE-005; analytics privacy decision.

- [ ] **LR-003 — Add a public funding and network guide.**
  **Status:** `NEXT`
  **Scope:** Explain Robinhood Chain, wallet connection, network switching, gas token, USDG acquisition/bridging, small test amounts, explorer verification, and common failures. All routes must be live-verified before publication.
  **Evidence required:** App route/content, source links, desktop/mobile screenshots, and a successful dry run from a fresh wallet.
  **Acceptance:** A new eligible user can fund and complete the selected first action without private coaching; unavailable or risky routes are not recommended.
  **Dependencies:** Live route research; eligibility review; LR-002 for drop-off measurement.

- [ ] **LR-004 — Add mobile WalletConnect support.**
  **Status:** `NEXT`
  **Scope:** Support mobile/deep-link and QR connection while preserving injected-provider behavior and the Robinhood Chain add/switch flow. The 2026-07-16 audit selected Reown AppKit with its Wagmi 2 adapter while retaining viem simulations/writes; gas sponsorship is explicitly outside this slice.
  **Evidence required:** Automated connection-state tests where feasible and a device/browser matrix covering Robinhood Wallet plus at least one common EVM wallet.
  **Acceptance:** Connect, switch/add chain, quote, approve, submit, reconnect, and disconnect work on supported mobile and desktop wallets; unsupported states fail with actionable copy.
  **Dependencies:** Wallet provider/project configuration; LR-002; funded QA wallets.

- [ ] **LR-005 — Publish reviewed product, eligibility, and risk disclosures.**
  **Status:** `IN PROGRESS`
  **Scope:** Clearly distinguish core redemption from periphery/DEX availability; explain immutable composition, fees, spot-price limitations, slippage, thin liquidity, stock-token restrictions, unaudited status, and that `$HOODL` is distinct from backed indexes.
  **Current evidence:** `/safety`, `web/src/components/Safety.tsx`, and `IndexSafetyNotice.tsx` publish audit status, core/periphery limits, Stock Token eligibility language, official source links, and a notice on index transaction panels. Counsel review and jurisdiction enforcement remain.
  **Evidence required:** Reviewed copy, source citations, and links from every transaction surface.
  **Acceptance:** Users see concise disclosures before material actions; claims match contracts and current external rules; legal questions are flagged for counsel rather than answered by engineering copy.
  **Dependencies:** Legal/compliance review for jurisdiction-specific language; SEC-003.

- [ ] **LR-006 — Run a release-grade app and contract verification pass.**
  **Status:** `IN PROGRESS`
  **Scope:** Run web lint/test/build, Foundry tests, gated fork tests when RPC access is available, and browser checks at desktop and mobile widths. Validate all deployed-index read paths and simulate writes without broadcasting privileged changes.
  **Current evidence:** On 2026-07-16, 22 Bun tests, web lint/build, 60 default Foundry tests, and `git diff --check` passed. The local `/safety` route rendered without browser warnings at desktop and 390px mobile widths. The local hAI detail route hit an HTTP RPC failure, so deployed-index reads, gated fork tests, and production transaction-panel verification remain open.
  **Evidence required:** Commands, results, browser matrix, and any waived checks with reason.
  **Acceptance:** Required checks pass; no console errors or horizontal overflow; live details, quotes, metadata, share routes, and failure states are verified.
  **Dependencies:** LR-003 through LR-005 for final release pass; funded wallets/RPC for optional live writes.

## Phase 1 — hMEME distribution and first users

**Exit condition:** hMEME has a canonical campaign surface, a documented and usable acquisition route, at least 25 external holders, ten external acquisitions, three successful exits, and five observed onboarding sessions.

- [ ] **DIST-001 — Ship a canonical hMEME acquisition page.**
  **Status:** `NEXT`
  **Scope:** Give `/hmeme` a focused story, immutable composition, current NAV and timestamp, fees, backing, acquisition choices, route/liquidity status, exit choices, risks, share metadata, and one primary small-dollar CTA. Reuse the generic index model rather than hard-coding contract truth in multiple places.
  **Evidence required:** Route tests, screenshots, metadata preview, and live contract/address links.
  **Acceptance:** A campaign link lands directly on a current, mobile-ready hMEME page; users can verify backing and choose a supported buy/mint path without first navigating the full app.
  **Dependencies:** LR-002, LR-005; live NAV/RPC.

- [ ] **DIST-002 — Design and verify the direct hMEME/USDG market plan.**
  **Status:** `NEXT`
  **Scope:** Determine venue/pool parameters, initial NAV and price method, capital amount, LP range, custody/lock, fee tier, slippage at target order sizes, rebalancing/maintenance responsibility, and unwind/incident procedure. Separate an index/USDG pool from the Zap’s component/USDG routes.
  **Evidence required:** Written simulation/fork results, quote table, exact addresses/PoolKey, capital-at-risk approval, and operator runbook.
  **Acceptance:** A reviewer can reproduce expected pricing and worst-case launch behavior; launch capital and control risks are explicitly accepted. No mainnet transaction is sent under this planning task.
  **Dependencies:** LR-001; treasury budget decision; SEC-001 ownership plan.

- [ ] **DIST-003 — Seed and register a direct hMEME/USDG market.**
  **Status:** `BLOCKED`
  **Blocker:** DIST-002 acceptance, treasury authorization, signer confirmation, and explicit approval of the exact mainnet transaction plan.
  **Scope:** Execute the approved launch, verify contract/pool state, register it with relevant discovery/indexing surfaces, and record every transaction and control address.
  **Evidence required:** Transaction hashes, explorer/pool links, initial and post-launch reserve snapshots, LP ownership/lock evidence, and successful buy + exit receipts.
  **Acceptance:** The direct market is discoverable, reserves and controls are public, price/slippage are shown in the app, and a small end-to-end external round trip succeeds.
  **Dependencies:** DIST-002, LR-005, LR-006, SEC-001.

- [ ] **DIST-004 — Run a concierge first-user cohort.**
  **Status:** `TODO`
  **Scope:** Recruit 10–20 eligible users, observe five sessions, record funnel outcomes, interview at least five, reimburse only under a predeclared policy, and fix the highest-frequency blocker before broad promotion. Do not map public wallet addresses to personal notes.
  **Evidence required:** Anonymized research log, funnel report, ranked issues, and follow-up decisions.
  **Acceptance:** At least ten external acquisitions and three successful external exits are confirmed; the top three blockers have owners and disposition.
  **Dependencies:** LR-002 through LR-006; DIST-001; DIST-003 or a verified Zap path.

- [ ] **DIST-005 — Publish a repeatable launch content kit.**
  **Status:** `TODO`
  **Scope:** Produce accurate short/long launch copy, visual assets, demo flow, contract links, FAQ, creator/user CTA, disclosure snippets, and a response plan for incidents or incorrect claims.
  **Evidence required:** Versioned source copy/assets and live-preview screenshots; all changing numbers carry timestamps.
  **Acceptance:** A launch post, partner repost, demo, and application can use one consistent fact set without inventing volume, holders, backing, or partnerships.
  **Dependencies:** DIST-001 through DIST-003; LR-005; SEC-003.

- [ ] **DIST-006 — Review acquisition performance weekly.**
  **Status:** `TODO`
  **Scope:** Report KPI deltas, source conversion, transaction failures, liquidity/slippage, user feedback, incidents, and the next experiment.
  **Evidence required:** Dated report linked from the iteration log.
  **Acceptance:** Every week ends with one continue/stop/change decision based on observed data.
  **Dependencies:** LR-001, LR-002, DIST-004.

## Phase 2 — `$HOODL` community token launch

**Exit condition:** `$HOODL` launches under published terms and verifiable controls, with no ambiguity about index backing or rights, and its campaign measurably produces HOODL index actions.

- [ ] **TOKEN-001 — Write and approve the `$HOODL` launch brief.**
  **Status:** `NEXT`
  **Scope:** State purpose, user promise, non-rights, utility at launch, supply/cap, allocations, vesting, treasury, liquidity, eligibility, distribution, governance limits, admin powers, emergency posture, launch channel, success metrics, and reasons not to launch. Include explicit hAI/hMEME separation.
  **Evidence required:** Versioned brief with unresolved questions and named approvers; contract behavior mapped to every public claim.
  **Acceptance:** No token-contract implementation begins until supply, allocations, vesting, admin model, liquidity budget, and legal-review scope have accepted decisions.
  **Dependencies:** User/product decisions; legal counsel for token and marketing posture.

- [ ] **TOKEN-002 — Select the minimum honest launch utility.**
  **Status:** `TODO`
  **Scope:** Prefer utility that exists on day one, such as transparent community curation signals, creator campaign participation, or bounty voting. Do not promise fee ownership, treasury claims, yield, or future price appreciation.
  **Evidence required:** User flow, abuse analysis, off-chain/on-chain boundary, and success metric.
  **Acceptance:** A holder can use the stated utility at launch; the app and docs accurately describe its limits.
  **Dependencies:** TOKEN-001; creator/distribution workflow decision.

- [ ] **TOKEN-003 — Specify and threat-model the token contract.**
  **Status:** `TODO`
  **Scope:** Default to a simple standard ERC-20 with fixed or clearly capped supply; document mint/burn/pause/blacklist/tax/upgrade behavior, permit support, vesting contracts, Safe roles, LP controls, and invariants. Avoid transfer taxes and hidden control paths.
  **Evidence required:** Specification, role diagram, invariants, threat model, and test plan.
  **Acceptance:** Every privileged action and supply-changing path is explicit; complexity not required by the approved brief is removed.
  **Dependencies:** TOKEN-001, TOKEN-002, SEC-001.

- [ ] **TOKEN-004 — Implement and test `$HOODL` plus launch tooling.**
  **Status:** `TODO`
  **Scope:** Implement the approved minimal contracts, allocation/vesting deployment, deterministic configuration, simulation, verification, and deployment-record schema. Use Foundry for contracts and Bun/TypeScript for typed orchestration where appropriate.
  **Evidence required:** Unit/fuzz/invariant tests, static-analysis results, dry-run/fork output, reviewed deployment diff, and reproducible commands.
  **Acceptance:** All specified invariants pass; allocations sum exactly; vesting and Safe roles match the brief; no secrets are logged; deployment can be simulated from a clean checkout.
  **Dependencies:** TOKEN-003; reviewer availability.

- [ ] **TOKEN-005 — Complete independent review and mainnet launch gate.**
  **Status:** `BLOCKED`
  **Blocker:** TOKEN-004 completion plus independent reviewer and legal/marketing review.
  **Scope:** Resolve findings, publish final terms/disclosures, verify Safe/vesting/liquidity configuration, rehearse launch and incident procedures, and obtain explicit approval for exact mainnet transactions.
  **Evidence required:** Review report and remediation, signer checklist, final bytecode/config hashes, transaction plan, public allocation table, and go/no-go record.
  **Acceptance:** No unresolved critical/high findings; deployed bytecode/config can be matched to reviewed artifacts; all public terms are live before trading begins.
  **Dependencies:** TOKEN-001 through TOKEN-004; SEC-001 through SEC-004.

- [ ] **TOKEN-006 — Launch `$HOODL` as an index-acquisition campaign.**
  **Status:** `BLOCKED`
  **Blocker:** TOKEN-005 go decision and authorized mainnet signers/capital.
  **Scope:** Execute reviewed transactions, verify contracts and allocations, publish controls/disclosures, activate launch utility, link a clear hMEME/hAI action, and monitor conversion plus abuse.
  **Evidence required:** Transactions, verified source, ownership/vesting/LP evidence, incident log, conversion report, and updated deployment records.
  **Acceptance:** Launch state matches published terms; there is no hAI/hMEME backing ambiguity; at least 20% of measurable participating wallets complete a subsequent index action, or the report explains why and changes the campaign.
  **Dependencies:** TOKEN-005, DIST-001, LR-002.

## Phase 3 — External creator loop

**Exit condition:** Three external creators launch understandable, metadata-complete indexes; each has at least one external holder and a documented path to NAV/Zap readiness or an explicit in-kind-only label.

- [ ] **CREATE-001 — Add a curated component registry and token picker.**
  **Status:** `TODO`
  **Scope:** Maintain verified token metadata, decimals, category, restriction/risk notes, Lens source status, Zap route status, and explorer links. Preserve an advanced address path with strong validation.
  **Evidence required:** Typed registry schema, provenance/update policy, tests, and UI states for unknown/unsupported tokens.
  **Acceptance:** A creator can choose known assets without manually copying addresses or decimals; the UI never implies that registry inclusion is endorsement or that periphery support is guaranteed.
  **Dependencies:** LR-005; operator/configuration policy.

- [ ] **CREATE-002 — Add human-friendly basket construction.**
  **Status:** `TODO`
  **Scope:** Support equal-dollar, percentage-weight, and fixed-unit modes; show launch-price timestamp, unit rounding, share NAV target, fee preview, immutable-composition warning, and generated raw parameters.
  **Evidence required:** Calculation tests across token decimals/prices, preview fixtures, and mobile UX review.
  **Acceptance:** A creator can target weights/NAV and understand the exact immutable units before signing; no floating-point math determines on-chain parameters.
  **Dependencies:** CREATE-001; reliable valuation sources.

- [ ] **CREATE-003 — Add preflight capability and risk checks.**
  **Status:** `TODO`
  **Scope:** Check ERC-20 behavior assumptions, duplicates/zero addresses, liquidity/quote availability at target sizes, Lens source freshness, Zap routes, estimated price impact, metadata validity, fees, and recipient/creator addresses.
  **Evidence required:** Typed result model, deterministic tests, and clear pass/warn/block UI.
  **Acceptance:** Every launch declares one of: USDG buy/sell ready, value-only, or in-kind-only; missing periphery configuration never blocks core redemption or gets hidden.
  **Dependencies:** CREATE-001, CREATE-002.

- [ ] **CREATE-004 — Automate launch page/artwork and readiness handoff.**
  **Status:** `TODO`
  **Scope:** Generate metadata preview, share page, artwork inputs, deployment receipt, operator configuration checklist, and a “USDG-ready” badge only after live verification.
  **Evidence required:** End-to-end staging launch and badge verification tests.
  **Acceptance:** A new index gets a shareable, accurate page immediately; capability badges derive from live reads, not creator claims.
  **Dependencies:** CREATE-003; metadata storage decision.

- [ ] **CREATE-005 — Concierge-launch three external creator indexes.**
  **Status:** `TODO`
  **Scope:** Recruit three creators, observe setup, review composition/metadata claims, help with funding and periphery configuration, and record friction without taking custody.
  **Evidence required:** Factory transactions, creator addresses, launch pages, readiness status, external-holder evidence, and anonymized research notes.
  **Acceptance:** Three external creators and three indexes meet the phase exit condition; learnings produce a ranked self-serve backlog.
  **Dependencies:** CREATE-001 through CREATE-004; LR-003 through LR-006.

## Phase 4 — Security, controls, and reliability

**Exit condition:** Privileged roles use documented multisig controls, public security material matches the system, critical paths are monitored, incident response is rehearsed, and independent review is underway or complete.

- [ ] **SEC-001 — Design and execute the Safe ownership migration.**
  **Status:** `NEXT`
  **Scope:** Inventory Factory/Lens/Zap/treasury/creator roles, choose signers and threshold, document signer security and recovery, simulate every transfer, then execute only an explicitly approved mainnet plan. Preserve the ability to operate required periphery configuration.
  **Evidence required:** Role inventory, Safe address/config, simulation, transaction hashes, explorer state, deployment-record update, and rollback/incident notes.
  **Acceptance:** Factory, Lens, Zap, and protocol treasury no longer depend on one EOA; every retained EOA role has a written rationale and removal date.
  **Dependencies:** Signer selection; hardware-wallet readiness; explicit transaction approval.

- [ ] **SEC-002 — Create an audit-ready technical package.**
  **Status:** `TODO`
  **Scope:** Architecture and trust boundaries, roles, invariants, external dependencies, deployment/config map, known risks, threat model, test strategy, privileged operations, and precise review scope.
  **Evidence required:** Versioned package linked to exact commit and deployed bytecode.
  **Acceptance:** An external reviewer can begin without reconstructing system behavior from pitch documents.
  **Dependencies:** SEC-001 design; current contract freeze decision.

- [ ] **SEC-003 — Publish a security and risk page.**
  **Status:** `IN PROGRESS`
  **Scope:** Disclose audit status, immutable core behavior, periphery/admin controls, oracle/spot-price limitations, liquidity risks, third-party dependencies, verified contracts, reporting contact, and supported/not-supported assumptions.
  **Current evidence:** The `/safety` route provides a public first version and verified-contract/source links. It must be reconciled with the audit-ready package, ownership migration, reporting contact, and external review before completion.
  **Evidence required:** Public URL and review record.
  **Acceptance:** App transaction surfaces link to one current security source; it does not overstate audit, oracle quality, or guarantees.
  **Dependencies:** SEC-002, LR-005.

- [ ] **SEC-004 — Add monitoring and incident response.**
  **Status:** `TODO`
  **Scope:** Monitor ownership/config changes, index creation, unusual mint/redeem/zap volume, NAV/source failures, quote failures, frontend/RPC health, and direct-market reserve/price deviations. Define severity, contacts, public status updates, and actions the immutable core cannot take.
  **Evidence required:** Alert tests, dashboards/runbooks, and a tabletop incident record.
  **Acceptance:** A simulated critical alert reaches the owner and produces the documented response within the target time; monitoring never implies a nonexistent pause power.
  **Dependencies:** LR-002, SEC-001, direct-market details if DIST-003 completes.

- [ ] **SEC-005 — Obtain an independent review, then scope an audit/bounty.**
  **Status:** `TODO`
  **Scope:** Start with a focused independent review of core/periphery and deployment configuration; remediate findings; obtain audit quotes; launch a bounded bug bounty with clear scope and safe reporting.
  **Evidence required:** Review/audit reports or attestations, remediation commits, scope/commit hashes, and bounty terms.
  **Acceptance:** No unresolved critical/high finding is knowingly exposed; public claims name the exact reviewed scope and commit.
  **Dependencies:** SEC-002, budget, reviewer/auditor availability.

## Phase 5 — Grants, accelerators, and portfolio proof

**Exit condition:** HOODL has a reusable, current evidence room and submits at least three well-matched applications/outreach packages supported by real user and security progress.

- [ ] **GROW-001 — Build the canonical evidence room/index.**
  **Status:** `TODO`
  **Scope:** Link one-liner, deck/demo, architecture, verified contracts, deployment history, test/security evidence, KPI snapshots, user research summary, roadmap, team profile, budget/use of funds, milestones, and truthful ecosystem integrations.
  **Evidence required:** Root index or private data-room index with public/private boundaries and update dates.
  **Acceptance:** An application can be assembled without copying stale facts from pitch-day documents; sensitive materials remain access-controlled.
  **Dependencies:** LR-001, SEC-002; at least one DIST-006 report.

- [ ] **GROW-002 — Maintain a scored opportunity pipeline.**
  **Status:** `NEXT`
  **Scope:** Track program, thesis fit, stage, geography/eligibility, deadline, requested amount, deliverables, warm intro, application status, next action, and source URL. Reverify every time-sensitive fact before acting.
  **Evidence required:** Dated pipeline with scoring rubric and sources.
  **Acceptance:** At least ten researched opportunities are ranked; the top three each have a concrete owner and next step.
  **Dependencies:** Current web research; no application submission authority implied.

- [ ] **GROW-003 — Create reusable grant/accelerator narratives.**
  **Status:** `TODO`
  **Scope:** Prepare versions centered on Robinhood Chain distribution, RWA/crypto indexes, permissionless creator infrastructure, technical/security rigor, and measurable adoption. Include a milestone budget tied to outcomes, not token price.
  **Evidence required:** Versioned answer bank and fact-check checklist.
  **Acceptance:** Every quantitative claim links to current evidence and every program-specific answer explains why that program materially accelerates the next milestone.
  **Dependencies:** GROW-001, GROW-002.

- [ ] **GROW-004 — Submit and track three high-fit applications/outreach packages.**
  **Status:** `TODO`
  **Scope:** Customize, obtain user approval for external submission, submit, save receipts, schedule follow-ups, and feed reviewer questions back into product/security work.
  **Evidence required:** Submission confirmations and follow-up log; private application data stays outside the public repo.
  **Acceptance:** Three high-fit opportunities receive complete, current packages; each has a follow-up date and outcome status.
  **Dependencies:** GROW-001 through GROW-003; explicit authorization before sending external messages/forms.

- [ ] **GROW-005 — Publish portfolio-quality technical case studies.**
  **Status:** `TODO`
  **Scope:** Explain core solvency/in-kind redemption, decimals and rounding, Uniswap v4 exact-output routing, live periphery configuration recovery, creator economics, security tradeoffs, and adoption experiments. Remove sensitive operational detail.
  **Evidence required:** Reproducible diagrams/tests and public posts linked to code.
  **Acceptance:** At least two technically rigorous pieces demonstrate design judgment, testing, live operations, and honest limitations to users, reviewers, and future employers.
  **Dependencies:** SEC-002; factual review; one completed distribution iteration.

## Phase 6 — Later composability

These are deliberately deferred until the 30-day user loop and security foundations show traction. Research may proceed, but production implementation must justify itself against current KPIs.

- [ ] **LATER-001 — Reconstitution/successor-index migration tooling.**
  **Status:** `DEFERRED`
  **Scope:** A non-custodial migration path to a successor immutable index; no mutable rebalancing hidden behind the existing token.
  **Evidence required:** Design, threat model, price/route behavior, and user demand.
  **Acceptance:** Users can inspect and choose migration; old-index redemption remains intact.
  **Dependencies:** Creator demand; independent review.

- [ ] **LATER-002 — Index-of-indexes support and UX.**
  **Status:** `DEFERRED`
  **Scope:** Nested backing visibility, recursive NAV, redemption UX, depth/cycle limits, and route implications.
  **Evidence required:** Formal invariants, gas/depth tests, and risk disclosure.
  **Acceptance:** No cycles or unbounded recursion; backing and exit paths remain understandable.
  **Dependencies:** Stable creator loop; security review.

- [ ] **LATER-003 — Lending/collateral integrations.**
  **Status:** `DEFERRED`
  **Scope:** Oracle methodology, liquidity/liquidation analysis, manipulation resistance, integration partner requirements, and isolated-market rollout.
  **Evidence required:** Independent oracle/risk analysis and partner review.
  **Acceptance:** Collateral claims do not rely on manipulable single-block spot NAV; risk parameters are externally reviewed.
  **Dependencies:** Meaningful liquidity/AUM, robust pricing, audit.

- [ ] **LATER-004 — Gas sponsorship and batched onboarding.**
  **Status:** `DEFERRED`
  **Scope:** Account-abstraction/paymaster support for first actions, abuse controls, budgets, batching, recovery, and analytics.
  **Evidence required:** Supported Robinhood Chain infrastructure verified live, cost/abuse model, and wallet UX tests.
  **Acceptance:** Sponsorship reduces measured funnel loss without creating uncontrolled spend or custody ambiguity.
  **Dependencies:** LR-002 metrics, LR-004 wallet architecture, budget.

- [ ] **LATER-005 — Automated/AI portfolio experiences.**
  **Status:** `DEFERRED`
  **Scope:** Discovery or construction assistance only after creator preflight and disclosures are reliable; avoid personalized financial advice claims and opaque autonomous execution.
  **Evidence required:** User demand, safety model, and measurable advantage over deterministic construction tools.
  **Acceptance:** Recommendations are explainable, opt-in, and do not weaken the immutable/non-custodial model.
  **Dependencies:** CREATE-001 through CREATE-005; legal/product review.

## Active iteration

**Iteration 1: measurable launch foundation (2026-07-16 onward)**

Recommended engineering sequence:

1. `LR-001` — establish current truth and the KPI baseline.
2. `LR-002` — make the first-user funnel measurable.
3. `DIST-001` — create the focused hMEME acquisition surface.
4. `LR-003` and `LR-005` — make onboarding and claims safe enough to share.
5. `DIST-002` — design the direct market before risking capital.
6. In parallel as product/security work: `TOKEN-001` and `SEC-001` design documents.

**Iteration exit criteria:** baseline snapshot is reproducible; typed funnel events are visible in production; `/hmeme` is campaign-ready on mobile; funding/risk content is reviewed; direct-market and token launch briefs are ready for explicit go/no-go decisions.

## Iteration log

Append one row per coherent implementation, validation, decision, or external milestone. Link commits/PRs, transaction hashes, reports, screenshots, or application receipts where applicable. Keep failed experiments: the decision evidence matters.

| Date | Iteration / task | Status change | Evidence | Decision / next step |
|---|---|---|---|---|
| 2026-07-16 | Roadmap baseline | Created `ROADMAP.md`; BASE-001 through BASE-005 recorded as shipped; launch/distribution/security gaps converted into acceptance-tested tasks | Current repo, `deployments/robinhood-mainnet.json`, `deployments/robinhood-meme-index.json`, `FEATURE_PARITY.md`, web and contract sources | Start with LR-001, LR-002, and DIST-001; keep mainnet transactions behind explicit task gates |
| 2026-07-16 | Iteration 1 foundation | LR-001, LR-002, LR-005, LR-006, and SEC-003 moved to `IN PROGRESS`; LR-004 moved to `NEXT` | Bun growth snapshot + parser tests; typed analytics + privacy tests; `/safety` route and transaction-panel notice; 22 Bun tests, web lint/build, 60 default Foundry tests, and desktop/mobile browser checks; WalletConnect architecture audit | Push to `main`; next isolate the Reown WalletConnect slice, then live-verify deployed-index reads and production analytics |

## Definition of done for every iteration

- The smallest user-visible or operational outcome is complete; partial plumbing is labeled `IN PROGRESS`.
- Relevant tests, lint, build, simulations, and browser checks pass, or waivers are recorded.
- Contract addresses, transactions, current metrics, and external claims have timestamped primary evidence.
- Security, privacy, eligibility, and irreversible/mainnet implications were reviewed in proportion to risk.
- Deployment records and user-facing docs changed with behavior when applicable.
- This roadmap’s task status and iteration log were updated in the same change.
- No unrelated user changes were overwritten, staged, or committed.
