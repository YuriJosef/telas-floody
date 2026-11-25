# Floody — Claude Code Project Instructions

## Source of truth and precedence

Read the existing root `AGENTS.md` and any applicable nested `AGENTS.md` before work. Its engineering, UX, accessibility, safety, testing, and Material 3 Expressive requirements apply to Claude Code too. This file adds Floody 2.1 requirements and overrides outdated Floody 2.0 milestones only where explicitly noted. The actual checked-out code and package manifests are the source of truth for current implementation details. Do not assume files, SDK versions, scripts, or features exist without checking.

## Current direction

- Work in the existing Floody 2.0 checkout; do not create a new repository or perform a wholesale rewrite.
- Preserve the existing UI direction, which has already received positive feedback. Material 3 Expressive remains the design direction even without a dedicated skill. Use installed Expo, Frontend Design, and UI/UX skills only where relevant and subordinate to project requirements.
- Continue web-first iteration and validation, but Floody 2.1 completion requires supported web and native workflows to be validated. Platform-specific code must remain appropriately separated.
- Brazilian Portuguese for user-facing UI; English for code, technical discussion, and documentation.
- This is a flood-information product: never fabricate live data or present unverified reports, risk estimates, or routes as officially verified or guaranteed safe.

## Floody 2.1 product contract — planned, not yet implemented

These are design requirements for approved implementation phases, not claims about current code:

- Backend: Supabase Auth, PostgreSQL/PostGIS, row-level security (RLS), and trusted server-side submission validation. Existing Supabase project is linked locally; inspect configuration before assuming operational readiness.
- Guests can browse published reports. Email/password users must have verified email to submit reports. Sign-in requires a confirmed e-mail, so only verified users may flag reports (decided 2026-11-12; replaces the earlier "unverified users may flag" requirement). Three flags from distinct verified accounts hide a report pending review.
- Submission must be within the official Recife Metropolitan Region (RMR) boundary polygon, not an approximate radius. GPS and manual map selection are both allowed and their provenance must be recorded, not treated as proof.
- Observation age must be at most six hours when received by the trusted server. Offline drafts older than six hours remain drafts and cannot auto-submit.
- Server validation and deterministic moderation determine publication eligibility. Published user reports are clearly labeled “Unverified user report”; suspicious reports are held for human review.
- Published reports expire 48 hours after initial publication. Restoration must not extend that deadline. Authors can withdraw reports immediately from public visibility.
- Authenticated flagging may temporarily hide reports after a configurable conservative threshold. Reviewer roles are admin-appointed, with safeguards against self-promotion and self-review. Review timeouts must never automatically republish hidden or suspicious reports. Approved 2026-11-12: threshold 3 verified flags; held or hidden reports close as expired after 24 h without review (configurable).
- Expired and withdrawn records are retained internally for seven days before purge, subject to approved retention policy. Account deletion should anonymize reports until their original expiry; review related logs and identifiers for privacy implications.
- Support offline local drafts, explicit retry, and per-author idempotent submissions via a `client_submission_id` contract. Do not promise background sync when the platform cannot guarantee it.
- Maintain fullscreen maps on web/native with compact expandable route planner overlay; make focused report-screen improvements without broad redesign.
- Test RLS, auth, report lifecycle/moderation, expiry, offline/idempotent submission, and cross-platform flows.

## Work authorization and safety

- The initial repository audit is strictly read-only. Do not edit files, install dependencies, run migrations, or contact/modify the remote Supabase project during the audit.
- When a subsequent task explicitly approves an implementation phase, changes to previously protected auth/reporting components are permitted **only within that approved scope**. Never treat a general roadmap as blanket authorization.
- Prepare and validate migrations locally first. **Never apply remote Supabase migrations, change production data, deploy Edge Functions, or alter remote auth/settings without separate explicit approval.**
- Never expose service-role keys or secrets in client bundles, logs, source control, or prompts. Enforce authorization and validation server-side; client-side checks are UX only.
- Preserve uncommitted changes and the approved visual baseline. Prefer small, reviewable diffs. No commits, pushes, merges, or PRs without explicit request.

## Windows and validation

- Use `npm.cmd` and `npx.cmd` in PowerShell when invoking Node package executables.
- Inspect `Floody/package.json` before using scripts. The previous instructions mention `npm.cmd test`, `npm.cmd run check`, and `npm.cmd run web`; verify they still exist.
- Read the versioned Expo documentation matching the installed SDK before changing Expo-specific APIs or dependencies.
- Playwright may be used for browser verification when configured. Browser testing does not prove native behavior.
- After approved edits: run appropriate checks, review diffs, and report what passed, failed, or was not run.

## Agent workflow and skills

1. Inspect code and applicable instruction files.
2. Identify confirmed facts, assumptions, dependencies, risks, and affected files.
3. For substantial or security-sensitive work, propose a plan and wait for approval.
4. Implement only the approved scope; validate incrementally.
5. Report changed files, tests actually executed, remaining risks, and unverified items.

Use installed Expo, Frontend Design, UI/UX Pro Max, Find Skills, and Claude Code Setup capabilities when applicable and available. Do not claim a skill is installed or was used unless verified. No Microsoft or Material 3 Expressive skill is required for this setup.
