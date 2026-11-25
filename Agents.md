# Floody 2.0 — Agent Instructions

## 1. Project Overview

Floody is a cross-platform flood-awareness, reporting, and navigation application intended primarily for Brazilian users.

The application is built with Expo SDK 58, React Native, and React Native Web. It contains separate web and native entry points, with some shared services and components.

The objective of Floody 2.0 is to deliver a high-quality application that is:

- Reliable and functionally correct
- Intuitive and accessible
- Visually coherent and modern
- Responsive across supported screen sizes
- Maintainable and extensible
- Appropriate for communicating flood-related information

The existing repository is the source of truth. Inspect the implementation before making assumptions about supported features.

## 2. Development Priorities

Prioritize the following, in order:

1. Functional correctness and preservation of existing behavior
2. User safety, data integrity, and accessibility
3. Clear information architecture and intuitive interactions
4. Consistent, high-quality visual design
5. Performance and responsiveness
6. Maintainability and architectural simplicity
7. Appropriate motion and visual refinement

Visual polish must never come at the expense of functionality or clarity.

## 3. Platform Strategy

- Design mobile-first.
- Implement and validate the responsive web application first.
- Adapt the approved design to Android and iOS in a later phase.
- Maintain a consistent design language across platforms while respecting platform-specific interaction conventions.
- Do not assume web and native implementations currently have feature parity.
- Do not introduce native-only APIs into web code or browser-only APIs into native code without appropriate platform separation.

## 4. Repository Structure

Repository root: `floody-2.0/`

Application root: `Floody/`

Important files and directories:

- `Floody/src/App.web.js` — Web application entry point
- `Floody/src/App.native.js` — Native application entry point
- `Floody/src/features/` — Application features
- `Floody/src/components/` — Reusable components
- `Floody/src/services/` — Services and integrations
- `Floody/src/navigation/` — Navigation
- `Floody/src/store/` — Application state
- `Floody/scripts/` — Validation and supporting scripts

Read applicable nested `AGENTS.md` files before making changes.

The existing `Floody/AGENTS.md` requires consulting the exact Expo SDK 58 documentation. Preserve and follow that instruction.

## 5. Development Workflow

Before implementation:

1. Inspect relevant files and understand existing behavior.
2. Identify the requirements, dependencies, and potential risks.
3. Explain the proposed solution and significant trade-offs.
4. Identify the files and systems likely to be affected.
5. For substantial redesigns, architectural changes, or changes involving sensitive functionality, prepare a plan and request approval.

During implementation:

1. Make focused, incremental, reversible changes.
2. Preserve existing behavior unless changes are explicitly authorized.
3. Follow established conventions where appropriate.
4. Prefer reusable components and shared abstractions when they reduce complexity.
5. Avoid unrelated refactoring and unnecessary dependency changes.
6. Handle loading, error, empty, and success states appropriately.
7. Validate each substantial implementation increment.

After implementation:

1. Run relevant automated checks.
2. Test affected user flows where feasible.
3. Inspect the diff for regressions and unintended modifications.
4. Identify remaining defects, limitations, and unverified behavior.
5. Summarize what changed and how it was verified.

A request for analysis, auditing, or planning does not authorize modifying the application.

## 6. Engineering Standards

- Write clear, modular, maintainable code.
- Favor straightforward solutions over unnecessary abstractions.
- Keep components focused and responsibilities separated.
- Prefer existing dependencies unless introducing a new one provides a justified benefit.
- Avoid duplicate business logic and unnecessary state.
- Handle asynchronous operations and failures explicitly.
- Preserve established service interfaces and data contracts unless a change is approved.
- Avoid silent failures and misleading success states.
- Consider accessibility, performance, security, and maintainability throughout development.
- Address root causes rather than hiding defects with superficial workarounds.
- Document significant architectural decisions and trade-offs.

Do not rewrite large parts of the application simply because an alternative architecture appears cleaner.

## 7. Material 3 Expressive Design System

Material 3 Expressive is the primary visual design direction for Floody 2.0.

Apply it thoughtfully rather than mechanically.

### Design requirements

- Establish reusable design tokens for colors, typography, spacing, shapes, and elevation.
- Use a coherent visual hierarchy across screens.
- Support light and dark themes where applicable.
- Use expressive shapes and typography without sacrificing readability.
- Maintain consistent component states and interaction patterns.
- Apply responsive layouts appropriate to each viewport.
- Use motion to communicate state changes and relationships, not merely for decoration.
- Respect reduced-motion preferences.
- Avoid excessive visual density, unnecessary cards, and decorative clutter.
- Use clear and accessible affordances for interactive elements.

### Design authority

Use the installed Material 3 Expressive skill as design guidance.

When applicable, verify important specifications against official Material Design documentation.

Do not invent official Material Design tokens, component specifications, measurements, or platform capabilities.

Distinguish documented Material specifications from Floody-specific design decisions.

## 8. UX and Information Architecture

Design for users who may need to access important information quickly, including under stressful conditions.

- Prioritize essential information and actions.
- Make navigation predictable and understandable.
- Minimize unnecessary steps in critical workflows.
- Provide clear labels rather than relying exclusively on icons.
- Ensure important actions remain discoverable on mobile.
- Make reporting workflows understandable and provide appropriate confirmation.
- Make map interactions usable on touchscreens and desktop browsers.
- Avoid presenting excessive information without a clear hierarchy.
- Maintain consistent terminology and interaction patterns.
- Ensure users can recover from errors without losing unnecessary progress.

Use Brazilian Portuguese for all user-facing application text.

Use English for code, technical documentation, and development discussions.

## 9. Flood Information and User Safety

Floody communicates information that may influence real-world decisions.

Therefore:

- Never fabricate flood observations, water-depth measurements, risk scores, emergency alerts, or hazard predictions.
- Do not represent simulated, estimated, or unavailable data as verified measurements.
- Clearly distinguish user-submitted reports from officially verified information.
- Do not imply that locally stored reports have been publicly published.
- Do not imply that a route is safe merely because it is displayed on a map.
- Clearly communicate uncertainty, missing data, and service failures.
- Do not silently replace failed API responses with fabricated live information.
- Avoid presenting unverified information as authoritative emergency guidance.
- Preserve provenance and timestamps where available.

Any proposed change to risk calculations, emergency messaging, routing safety, or report publication requires explicit approval.

## 10. Protected Functionality

Do not modify the following systems without explicit authorization:

- Authentication and session management
- Report persistence and publication
- Geolocation and location permissions
- Routing and navigation logic
- External API contracts and integrations
- Data validation and integrity rules
- Security-sensitive configuration

Visual redesigns must preserve the behavior of these systems.

Never introduce placeholder functionality that appears operational when it is not.

## 11. Security and Repository Safety

- Never expose credentials, tokens, or private information.
- Do not commit `.env`, `node_modules`, build artifacts, or other ignored files.
- Do not introduce insecure storage of sensitive information.
- Avoid unnecessary collection or retention of personal data.
- Do not run destructive commands without explicit approval.
- Never discard uncommitted user changes.
- Do not force-push, merge, deploy, or modify remote repositories without explicit authorization.
- Do not create commits or pull requests unless requested.
- Prefer isolated feature branches for substantial changes.

## 12. Expo and React Native Requirements

- Respect Expo SDK 58 and compatible dependency versions.
- Consult the exact versioned Expo documentation when necessary.
- Follow established React Native and React Native Web conventions.
- Keep platform-specific implementations separated where required.
- Avoid unsupported native dependencies or incompatible package versions.
- Explain compatibility and maintenance implications before adding dependencies.
- Preserve functional behavior across supported platforms.
- Do not assume that a browser implementation will automatically work on Android or iOS.

## 13. Skills and Tool Usage

Use installed skills according to their specific strengths.

### Official Expo skills

Use for:

- Expo and React Native architecture
- Platform compatibility
- Navigation and native UI
- Data fetching and application integration
- Animation and platform-specific development

### Material 3 Expressive

Use for:

- Design tokens and visual language
- Material components
- Typography, shape, and color systems
- Motion principles
- Design consistency

Consult `.agents/skills/m3-expressive/SKILL.md` if installed at that path.

### Anthropic Frontend Design

Use for:

- Visual composition and refinement
- Typography and spacing
- Responsive layout quality
- Avoiding generic or inconsistent interfaces

Its recommendations must remain compatible with the approved Material 3 Expressive design system.

### UI/UX Pro Max

Use for:

- Information architecture
- Usability and interaction design
- Accessibility considerations
- Responsive design decisions
- Interface consistency

### Playwright

Use for:

- Browser interaction testing
- Responsive viewport inspection
- Screenshots and visual verification
- Navigation and form testing
- Regression detection

Use the Playwright MCP integration when available.

### Skill precedence

When guidance conflicts, prioritize:

1. Functional correctness and user safety
2. Accessibility
3. Expo SDK 58 and platform compatibility
4. Approved Material 3 Expressive design direction
5. Usability and information architecture
6. Visual refinement

Skills are advisory resources, not permission to disregard project requirements.

Read only relevant skill entry points and reference materials. Do not load unrelated skills unnecessarily.

If a skill or tool is unavailable, report that limitation rather than pretending to have used it.

## 14. Testing and Validation

The application uses npm scripts defined in `Floody/package.json`.

On this Windows system, use `npm.cmd` rather than `npm` in PowerShell.

From the `Floody/` directory:

- `npm.cmd test` — Service tests
- `npm.cmd run check` — Project checks
- `npm.cmd run web` — Web development server

For UI changes:

- Inspect mobile and desktop viewport sizes.
- Test navigation and interactive controls.
- Verify loading, empty, error, and success states.
- Check light and dark themes where supported.
- Verify keyboard accessibility and visible focus states.
- Check responsive behavior and layout overflow.
- Use Playwright for browser-based verification when available.
- Perform manual accessibility checks in addition to automated checks.

For behavior changes:

- Test affected workflows.
- Add or update automated tests where practical.
- Verify error handling and data integrity.
- Check for regressions in related features.

Never claim tests passed unless they were actually executed.

Clearly distinguish implemented, verified, unverified, and incomplete work.

## 15. Performance Requirements

- Avoid unnecessary re-renders and expensive computations during rendering.
- Keep the application responsive on ordinary mobile devices.
- Avoid excessive animation, oversized assets, and unnecessary network requests.
- Consider loading behavior and perceived performance.
- Optimize map interactions and frequently updated interfaces where appropriate.
- Avoid premature optimization that introduces unnecessary complexity.
- Measure performance when making specific performance claims.

## 16. Communication and Reporting

Before substantial implementation, provide:

- A concise summary of the problem
- The proposed solution
- Important risks and trade-offs
- The expected scope of changes

After implementation, provide:

- What changed
- Which files or systems were affected
- Which tests were executed and their results
- Any known limitations
- Any follow-up work that remains

Be precise and transparent.

Do not claim successful implementation based solely on generated code, screenshots, or assumptions.

## 17. Definition of Done

A task is complete only when:

1. Its agreed requirements have been implemented.
2. The implementation is consistent with the application's architecture.
3. Relevant automated checks have been executed.
4. Important affected user flows have been validated where feasible.
5. Accessibility and responsive behavior have been considered and tested appropriately.
6. The final diff has been reviewed for regressions and unnecessary complexity.
7. Known limitations and unverified behavior have been disclosed.
8. The resulting code is maintainable and understandable by other developers.

A visually attractive interface alone is not sufficient evidence of a working application.