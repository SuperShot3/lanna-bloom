# Campaign Builder Assistant — AI Technical Handoff

Use this document to understand the current Campaign Builder Assistant before proposing improvements or a refactor. Verify the implementation files referenced below before making changes because this feature controls privileged Google Ads mutations.

## Purpose

The Campaign Builder Assistant is an owner-controlled workflow for preparing Google Ads Search campaigns from the Lanna Bloom admin dashboard. It combines explicit human decisions, reusable marketing guidance, deterministic rule-based suggestions, optional AI generation, validation, and Google Ads creation.

The feature is designed to keep campaign creation reviewable and safe:

- every wizard step is editable and requires approval;
- AI is optional and never selects the target territory;
- rule-based generation remains available without AI;
- server-side validation runs before external creation;
- live campaigns, ad groups, and ads are created paused;
- privileged mutations are restricted to the `OWNER` role;
- campaign actions are recorded in the marketing audit table.

Admin location: `/admin/marketing` → **Campaign Builder**

## Read before changing this feature

Read these project files first:

1. `ai_context/00_START_HERE.md`
2. `ai_context/02_ARCHITECTURE_MAP.md`
3. `ai_context/03_SECURITY_RULES.md`
4. `ai_context/05_ANALYTICS_GTM_GA4_ADS.md`
5. `ai_context/06_ADMIN_ACCOUNTING_EMAIL.md`

Important boundaries to preserve:

- Admin UI visibility is not an authorization boundary. Every privileged API mutation must enforce session and RBAC server-side.
- Supabase service-role credentials, Google Ads credentials, and OpenAI credentials must remain server-only.
- The maximum new-campaign daily budget is enforced server-side.
- Campaign creation must remain paused by default unless a separately reviewed activation workflow is introduced.
- Never test Google Ads mutations against a live customer account. Mock external writes.

## Current user workflow

The current implementation is a six-step wizard.

### 1. Location

The owner explicitly selects one supported Thailand market:

- Chiang Mai
- Phuket
- Pattaya
- Krabi
- Koh Samui
- Hua Hin

The user also selects the location-targeting mode:

- `PRESENCE`
- `PRESENCE_OR_INTEREST`

Location is not selected by AI. Territory profiles provide the Google Ads geo-target ID, market slug, default landing page, audience notes, keyword seeds, and cross-city exclusions.

### 2. Audience and landing URL

The user confirms:

- campaign language;
- territory-matched landing URL;
- occasion or product focus;
- audience context;
- delivery context;
- optional custom notes.

The current campaign output is English-only. Expansion-market landing pages must use the selected market path under `/en`.

### 3. Ad groups

The user creates or generates one to three intent-focused ad groups. Suggestions may come from:

- deterministic territory rules;
- optional OpenAI generation;
- custom reusable guidance;
- direct manual editing.

### 4. Keywords

Keywords are organized by ad group. Only these match types are supported:

- `EXACT`
- `PHRASE`

Broad match is not supported. Generated keywords are territory-aware, and cross-city checks help prevent campaigns for one destination from matching another destination.

### 5. Negative keywords

The assistant starts with deterministic negative-keyword rules:

- global low-intent exclusions;
- cross-city exclusions;
- optional occasion-related exclusions.

Custom themes may be added. When AI is configured, it may append suggestions but does not replace the deterministic base library.

### 6. Ad copy, budget, review, and creation

The user reviews or edits:

- responsive search ad headlines;
- responsive search ad descriptions;
- landing URL;
- campaign name;
- targeting mode;
- accumulated custom guidance;
- daily budget.

The default budget is 500 THB per day. The server-side maximum is 5,000 THB per day.

After approving the final step, the owner can:

1. validate the complete campaign;
2. perform a dry run;
3. create the campaign in Google Ads.

Live creation always creates paused campaign resources.

## Additional current capabilities

- Up to 50 recently updated drafts are listed and can be resumed.
- Each step stores its own output and approval metadata.
- Reusable guidance chips can be saved by category and reused in future drafts.
- Generated content records whether its source was `rules`, `ai`, or `rules+ai`.
- Managers can view marketing data; Campaign Builder mutations are owner-only.
- Draft creation, editing, generation, approval, validation, dry runs, and live creation happen through server APIs.

The current UI does not provide:

- draft deletion or cancellation;
- campaign-name editing;
- start-date or end-date controls;
- bidding-strategy selection;
- Google Ads asset selection;
- a Campaign Builder audit-history viewer;
- campaign activation.

## Architecture

### Main UI

- `app/admin/(dashboard)/marketing/MarketingDashboardClient.tsx`
- `app/admin/(dashboard)/marketing/CampaignBuilderTab.tsx`
- `app/admin/(dashboard)/marketing/campaign-builder/CampaignBuilderWizard.tsx`
- `app/admin/(dashboard)/marketing/campaign-builder/StepShell.tsx`
- `app/admin/(dashboard)/marketing/campaign-builder/CustomGuidanceField.tsx`
- `app/admin/(dashboard)/marketing/campaign-builder/steps/LocationStep.tsx`
- `app/admin/(dashboard)/marketing/campaign-builder/steps/AudienceStep.tsx`
- `app/admin/(dashboard)/marketing/campaign-builder/steps/AdGroupsStep.tsx`
- `app/admin/(dashboard)/marketing/campaign-builder/steps/KeywordsStep.tsx`
- `app/admin/(dashboard)/marketing/campaign-builder/steps/NegativeKeywordsStep.tsx`
- `app/admin/(dashboard)/marketing/campaign-builder/steps/AdCopyReviewCreateStep.tsx`
- `app/admin/(dashboard)/marketing/CampaignBuilderTab.module.css`

### Main server modules

- `lib/marketing/campaignBuilder/store.ts` — Supabase persistence
- `lib/marketing/campaignBuilder/types.ts` — final draft and database record types
- `lib/marketing/campaignBuilder/limits.ts` — budget safety limit
- `lib/marketing/campaignBuilder/territories.ts` — supported territory handling
- `lib/marketing/campaignBuilder/negativeKeywords.ts` — negative-keyword rules
- `lib/marketing/campaignBuilder/validateDraft.ts` — final validation
- `lib/marketing/campaignBuilder/googleAdsCreateSearchCampaign.ts` — Google Ads writes
- `lib/marketing/campaignBuilder/googleAdsAssets.ts` — asset lookup and validation
- `lib/marketing/campaignBuilder/wizard/steps.ts` — wizard state and step types
- `lib/marketing/campaignBuilder/wizard/territoryProfiles.ts` — territory profiles
- `lib/marketing/campaignBuilder/wizard/generateStep.ts` — rules and optional AI generation
- `lib/marketing/campaignBuilder/wizard/approveStep.ts` — step approval
- `lib/marketing/campaignBuilder/wizard/validators.ts` — per-step validation
- `lib/marketing/campaignBuilder/wizard/customGuidance.ts` — guidance sanitization
- `lib/marketing/campaignBuilder/wizard/stepPrompts.ts` — step-specific AI prompts
- `lib/marketing/campaignBuilder/llmClient.ts` — OpenAI request handling
- `lib/marketing/adminApi.ts` — marketing API session and RBAC guards
- `lib/marketing/config.ts` — Google Ads, GA4, and AI configuration status

## Data flow

The normal wizard flow is:

1. The marketing dashboard loads configuration status.
2. The wizard loads recent drafts, supported territories, and reusable guidance.
3. Starting the wizard inserts a row in `marketing_campaign_drafts`.
4. Editing a step stores JSON in `step_outputs`.
5. Generating a step builds deterministic output and optionally asks OpenAI for structured suggestions.
6. Approving a step validates the submitted output and records approval time and owner email.
7. Approving the final step calls `mergeWizardToDraft()`.
8. The merge materializes `structured_brief` and `campaign_draft`.
9. Final validation checks the materialized campaign.
10. Dry-run creation returns synthetic resource names without writing to Google Ads.
11. Live creation writes resources through the Google Ads API.
12. The returned Google Ads resource names are stored on the draft.
13. Approval, validation, creation, and failures are written to `marketing_apply_audit`.

The workflow state is mainly stored in JSON columns rather than normalized step, ad-group, keyword, or approval tables.

## API surface

### Current wizard

- `GET /api/admin/marketing/campaign-drafts`
- `POST /api/admin/marketing/campaign-drafts`
- `GET /api/admin/marketing/campaign-drafts/[id]`
- `PATCH /api/admin/marketing/campaign-drafts/[id]`
- `PATCH /api/admin/marketing/campaign-drafts/[id]/steps/[step]`
- `POST /api/admin/marketing/campaign-drafts/[id]/steps/[step]/generate`
- `POST /api/admin/marketing/campaign-drafts/[id]/steps/[step]/approve`
- `POST /api/admin/marketing/campaign-drafts/[id]/validate`
- `POST /api/admin/marketing/campaign-drafts/[id]/create`
- `GET /api/admin/marketing/campaign-drafts/territories`
- `GET /api/admin/marketing/campaign-drafts/custom-guidance`
- `POST /api/admin/marketing/campaign-drafts/custom-guidance`
- `DELETE /api/admin/marketing/campaign-drafts/custom-guidance/[id]`

### Legacy single-shot flow

- `POST /api/admin/marketing/campaign-drafts/questions`
- `POST /api/admin/marketing/campaign-drafts/generate`

The legacy flow is not the active wizard and should be explicitly retained, migrated, or removed during a refactor.

### Related unfinished asset surface

- `GET /api/admin/marketing/assets`

Assets can be fetched and validated by server modules, but the current wizard does not offer asset selection and live creation does not create asset associations.

## Persistence

### `marketing_campaign_drafts`

The draft table stores:

- status;
- admin email;
- natural-language prompt and answers used by the legacy flow;
- structured brief;
- final campaign draft;
- validation result;
- selected asset resource names;
- created Google Ads resource names;
- apply error;
- current wizard step;
- step outputs;
- step approvals;
- territory context;
- prompt version;
- timestamps.

Migrations:

- `supabase/migrations/20260628120000_marketing_campaign_drafts.sql`
- `supabase/migrations/20260629120000_campaign_builder_wizard.sql`

### `marketing_campaign_guidance_library`

Stores reusable category and label pairs.

Migration:

- `supabase/migrations/20260629123000_campaign_builder_custom_guidance_library.sql`

### `marketing_apply_audit`

Stores marketing mutation audit records and is shared with marketing recommendations.

Migration:

- `supabase/migrations/20260625200000_marketing_insights.sql`

These private tables use RLS, revoke browser roles, and grant access to the server-side service role.

## Authentication and authorization

Relevant files:

- `auth.ts`
- `middleware.ts`
- `lib/adminRbac.ts`
- `lib/marketing/adminApi.ts`

Current authorization model:

- `OWNER` and `MANAGER` may access marketing view endpoints.
- `OWNER` is required for Campaign Builder mutations.
- The API performs the real authorization checks.
- Client-side `isOwner` checks only control presentation and disabled states.

Audit coverage currently includes:

- step approval;
- validation;
- dry-run validation;
- dry-run creation;
- live creation;
- failed creation.

Audit coverage currently excludes:

- ordinary step edits;
- generation requests;
- draft creation;
- reusable-guidance changes.

## AI and deterministic generation

AI is optional. `OPENAI_API_KEY` enables it. When AI is unavailable or returns no usable JSON, deterministic rules are used.

Location and audience selection do not use AI.

### Ad groups

- Rules generate territory-specific intent groups.
- Custom ad-group ideas may replace default rule names.
- AI may return up to three names.

### Keywords

- Rules use territory-specific commercial-intent templates.
- Generated keywords are split across ad groups.
- Only phrase and exact match are used.
- AI receives territory context, approved groups, and accumulated guidance.

### Negative keywords

- Deterministic negatives are always the base.
- Custom negative themes are appended.
- AI may add phrase-match suggestions.
- AI does not replace required rule-based negatives.

### Ad copy

- Rules generate five headlines and two descriptions per group.
- AI receives territory rules, keywords, landing URL, and accumulated guidance.
- Existing budget is preserved during regeneration.

### OpenAI behavior

- Uses the Chat Completions API.
- Requests JSON output.
- Uses temperature `0.2`.
- Default model is `gpt-4o-mini`.
- Model names can be overridden with environment variables.
- Token usage and estimated cost are stored in generation metadata.

Current weakness: JSON is parsed and cast to the requested TypeScript type without runtime schema validation. Parseable JSON with the wrong shape may reach downstream code.

## Validation and safety rules

Validation is split between per-step validators, final-draft validation, parsers, prompt instructions, and UI limits.

Current enforced rules include:

- selected territory must be supported;
- campaign output is English-only;
- landing URL host must be approved;
- landing path must use `/en` or an `/en/...` route;
- expansion landing URLs must contain the selected market slug;
- one to three ad groups;
- Thai characters are blocked in campaign names, positive keywords, ad copy, and custom guidance;
- wrong-city keywords and copy are blocked;
- known low-intent positive keywords are blocked;
- broad match is blocked;
- each ad group requires at least three headlines and two descriptions;
- headlines are limited to 30 characters;
- descriptions are limited to 90 characters;
- same-day claims are blocked outside Chiang Mai;
- daily budget must be greater than zero and no more than 5,000 THB;
- custom guidance has tag-count and text-length limits;
- missing default negatives produces a warning;
- unsafe absolute or price claims produce warnings.

Known validation gaps:

- no start-date or end-date format/order validation;
- no strong assertion that the final geo-target ID belongs to the territory name;
- no complete duplicate, empty, or maximum-count checks for manually edited keywords;
- no English/content checks for negative keywords;
- empty headline or description strings can count toward minimum item counts;
- no campaign-name length validation;
- warnings do not block creation;
- `PRESENCE_OR_INTEREST` is still allowed even though `PRESENCE` is the safer default.

## Google Ads creation behavior

Live creation in `googleAdsCreateSearchCampaign.ts` performs sequential mutations:

1. Create a non-shared standard budget.
2. Create a paused Search campaign.
3. Enable Google Search.
4. Disable search partners and display/content networks.
5. Configure positive and negative geo-target behavior.
6. Add the selected location criterion.
7. Add English language criterion `1000`.
8. Add campaign-level negative keywords.
9. Create paused standard ad groups.
10. Create keyword criteria in those paused groups.
11. Create paused responsive search ads.
12. Return collected resource names.

Important details:

- campaign, ad groups, and ads are paused;
- keyword criteria are enabled inside paused ad groups;
- creation always sends manual CPC configuration;
- dry runs do not write to Google Ads;
- dry runs still require Google Ads configuration;
- selected assets are validated but are not actually linked;
- writes are sequential and non-atomic;
- there is no rollback or idempotency key;
- retries or concurrent requests can create duplicate or partial resources.

## Configuration

### Required for persistence

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Required for admin sessions

- `AUTH_SECRET`
- an active `admin_users` record with a valid role and password hash

### Required for Google Ads creation

- `GOOGLE_ADS_DEVELOPER_TOKEN`
- `GOOGLE_ADS_CLIENT_ID`
- `GOOGLE_ADS_CLIENT_SECRET`
- `GOOGLE_ADS_REFRESH_TOKEN`
- `GOOGLE_ADS_CUSTOMER_ID`
- optional `GOOGLE_ADS_LOGIN_CUSTOMER_ID`

### Optional AI configuration

- `OPENAI_API_KEY`
- `MARKETING_CAMPAIGN_BUILDER_STRUCTURE_LLM_MODEL`
- `MARKETING_CAMPAIGN_BUILDER_COPY_LLM_MODEL`

### URL configuration

- `NEXT_PUBLIC_APP_URL`

See `.env.example` and `lib/marketing/config.ts` for the current configuration contract.

## Tests

The existing Campaign Builder test file is:

- `lib/marketing/campaignBuilder/validateDraft.test.ts`

Run it with:

```bash
node --import tsx lib/marketing/campaignBuilder/validateDraft.test.ts
```

It currently covers selected validation helpers, territory IDs, negative-keyword composition, legacy prompt extraction, landing URL restrictions, budget limits, and basic final-draft validation.

Important missing coverage:

- each wizard step validator;
- approval order;
- downstream invalidation;
- every territory profile;
- custom-guidance sanitization;
- malformed or partial AI responses;
- deterministic generation for every step;
- wizard-to-final-draft merging;
- API authentication and RBAC;
- API integration;
- Supabase failures;
- Google Ads payloads;
- partial external failures and recovery;
- duplicate or concurrent creation;
- UI save races and resume behavior;
- reusable-guidance CRUD;
- audit completeness;
- legacy-flow compatibility.

## Known technical debt and refactor risks

### 1. Upstream edits can leave stale downstream approvals

Helpers exist to clear downstream outputs and approvals, but the current UI does not normally request that clearing. A user can go back, change an early step, and leave later approvals or the materialized final draft stale.

Relevant files:

- `lib/marketing/campaignBuilder/wizard/steps.ts`
- `lib/marketing/campaignBuilder/wizard/approveStep.ts`
- `app/admin/(dashboard)/marketing/campaign-builder/CampaignBuilderWizard.tsx`

### 2. Approval order relies too heavily on the UI

The UI guides users through sequential approval, but the approval API does not fully enforce that all preceding steps are approved. Direct API clients may approve out of sequence.

### 3. Created drafts can still be regenerated

Some mutation routes reject created drafts, but the generation route can still overwrite step output after Google Ads creation.

### 4. Legacy single-shot records conflict with wizard requirements

The legacy generate routes still exist, while newly inserted records use the v2 wizard prompt version. The create route requires all six wizard approvals for v2 records, so legacy-generated records may be impossible to create through the current path.

Relevant files:

- `app/api/admin/marketing/campaign-drafts/generate/route.ts`
- `lib/marketing/campaignBuilder/store.ts`
- `app/api/admin/marketing/campaign-drafts/[id]/create/route.ts`

### 5. AI output lacks runtime schema validation

Prompt instructions are acting as the schema. Add runtime validation before storing or consuming generated output.

### 6. Google Ads writes are non-atomic and non-idempotent

A failure after budget or campaign creation can leave partial resources. A retry can create duplicates. This is the highest-risk external-side-effect area.

### 7. Asset support is incomplete

The repository contains asset listing, validation, and storage fields, but there is no complete UI-to-Google-Ads asset-linking flow.

### 8. Types and behavior have drifted

Examples:

- final draft types allow `MAXIMIZE_CLICKS`, but creation uses manual CPC;
- audience types allow Thai, but current validation requires English;
- territory context includes local-history state that is currently always false;
- some documentation describes PRESENCE-only behavior while the code permits `PRESENCE_OR_INTEREST`.

### 9. Database and audit errors can be hidden

Some store methods return empty arrays on Supabase failure, making outages look like empty data. Some audit insertion failures are ignored.

### 10. Validation rules are duplicated

Headline limits, description limits, language checks, budget limits, and match-type constraints exist in multiple layers. This creates drift risk and makes behavior harder to test.

## Recommended planning priorities

The next AI should propose a staged plan rather than a broad rewrite.

### Priority 1 — Protect workflow integrity

Plan how to:

- enforce approval order server-side;
- invalidate downstream outputs and approvals when upstream inputs change;
- prevent all mutation of created drafts;
- prevent stale `structured_brief` and `campaign_draft` data;
- add optimistic concurrency or version checks for autosave races.

### Priority 2 — Make external creation recoverable

Plan how to:

- make create requests idempotent;
- prevent concurrent duplicate creation;
- persist operation state before each Google Ads mutation;
- detect and recover partial resources;
- expose a safe retry or reconciliation path;
- test all Google Ads calls through a mock adapter.

### Priority 3 — Consolidate schemas and validation

Plan how to:

- introduce runtime schemas for API bodies, stored step output, and AI output;
- centralize shared limits and validation rules;
- reject empty or duplicate campaign content;
- make warnings versus blocking errors explicit;
- support migration of existing JSON records.

### Priority 4 — Resolve product and legacy decisions

Decide whether to:

- remove or migrate the legacy single-shot flow;
- support only `PRESENCE` or retain `PRESENCE_OR_INTEREST`;
- support one bidding strategy or expose multiple strategies correctly;
- finish asset support or remove unfinished fields and APIs;
- add dates and campaign-name editing;
- expose audit history and draft cancellation.

### Priority 5 — Improve maintainability and tests

Plan how to:

- split the large wizard state component into a state/data layer and step presentation;
- define one typed API client for Campaign Builder requests;
- add unit tests for rules and schemas;
- add API authorization and workflow tests;
- add UI tests for resume, upstream edits, and failed saves;
- add Google Ads contract tests with mocked requests.

## Decisions another AI must not assume

The refactor plan should ask for or explicitly state decisions about:

1. Is the legacy single-shot flow still required?
2. Should `PRESENCE_OR_INTEREST` remain available?
3. Is manual CPC the only intended bidding strategy?
4. Should image assets be finished or removed from the current model?
5. Should created drafts become permanently immutable?
6. What should happen when only part of a Google Ads campaign is created?
7. Should warnings ever block creation?
8. Is the current JSON-column model retained or migrated?
9. Is the Campaign Builder intended to remain English-only?
10. Should reusable guidance be global or scoped by owner, territory, or campaign type?

## Prompt for a planning AI

Copy this prompt together with this document:

> Inspect the actual Campaign Builder Assistant implementation before proposing changes. Produce a staged refactor and improvement plan, not code. Preserve owner-only server authorization, server-only secrets, the 5,000 THB budget cap, territory and language safety checks, auditability, and paused-by-default Google Ads creation. Prioritize workflow-state integrity and idempotent/recoverable Google Ads writes before UI cleanup. Identify database migrations, compatibility risks, tests, rollout steps, and rollback strategy for every stage. Clearly separate confirmed behavior from assumptions and list product decisions that require owner input.

