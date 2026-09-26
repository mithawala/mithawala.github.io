---
name: build-personal-edition
description: 'Build an independent edition of Asif Mithawala personal website with full creative freedom over its design and interactions. Use when adding a model version, designing a theme, or registering an edition. Encourage ambitious original work, including 3D, while preserving canonical content and shared capabilities.'
argument-hint: 'Exact model name and optional creative brief'
user-invocable: true
---

# Build An Independent Personal-Site Edition

## Creative Freedom Comes First

You have full creative freedom over the edition's design. Act as its art director:
make an original, memorable website that expresses your own point of view.
Technical compliance is the floor; creative distinction is the goal.

Choose the entire visual and interactive language: layout, navigation concept,
section order, typography, palette, density, imagery, illustration, geometry,
materials, motion, and depth. Invent a new way to experience this person's work.
The shared content is your subject matter, not a predesigned page to decorate.

- Explore ambitious ideas and prototype the most distinctive part early.
  Choose the strongest direction yourself and carry it through the whole site.
- Think beyond a conventional portfolio: an immersive space, an expressive
  publication, an interactive instrument, or something none of those describes.
  These are invitations, not a menu or a preferred aesthetic.
- Embrace experimentation with 3D, shaders, canvas, SVG, new browser capabilities,
  and interaction libraries when they serve your concept. Suitable dependencies
  and locally hosted assets are welcome.
- Make confident aesthetic decisions without asking permission for each effect
  or justifying every motif. Restraint, maximalism, playfulness, and cinematic
  expression are equally available; there is no prescribed amount of motion.
- Judge the result as a designed experience, not merely a passing test suite.
  Look at your own screenshots, use the site, and refine what feels unfinished.

The six content sections are semantic destinations, not a requirement for six
stacked bands. Shared components supply behavior, not mandatory markup or styling.
You may restyle, compose, or extend them and their hooks to realize your concept
while keeping the complete accessible experience.

## 3D And Experimental Interaction

Treat real-time 3D and WebGL as first-class creative tools, not extras to avoid.
Prototype the interaction you want, then solve its engineering challenges.
When the brief leaves the medium open, choose it freely without defaulting to
the easiest implementation. This skill imposes neither a 3D quota nor a 2D default.

If the user explicitly requests a WebGL/3D edition, deliver a working real-time
3D element in the normal experience. CSS perspective, a static render, or an
explanation for omitting it does not fulfill that request. A fallback supports
the feature; it does not replace the requested implementation.

Engineer for reach: keep content accessible through DOM and keyboard/touch
controls, support reduced motion and graphics-unavailable fallbacks, and load
heavy rendering within your edition. Test the interactive experience as well as
the offline, reduced-motion composition used by CI. These are implementation
problems to solve, not reasons to abandon the creative direction. Mark a scene
that renders asynchronously with `data-rendering` until its first complete frame
so preview capture waits for it; see the contract's screenshot section.

## Independent Starting Point

Start with canonical content and neutral APIs. Do not inspect mithawala.com,
the reference checkout's UI, or earlier themes, previews, and screenshots for
inspiration. The migration is finished; the repository stands on its own.
An explicit request to refine an existing edition permits inspecting that edition,
not borrowing from it when creating the next one.

Read:

1. `AGENTS.md`, `README.md`, and `docs/content-and-features.md`.
2. Every record in `content/asif/`, including full project and article bodies.
3. `src/asif/content.mjs`, `core.jsx`, `features.jsx`, `Dialog.jsx`,
   `MusicPlayer.jsx`, and `images.mjs` for shared behavior and media helpers.
4. `src/versions.mjs` as registry metadata, without following earlier theme imports.
5. `tests/e2e/site.spec.mjs` for the behavioral contract, not a layout template.

Optional research can expand your vocabulary:
[frontend-design principles](https://github.com/anthropics/skills/tree/main/skills/frontend-design),
[interaction guidance](https://vercel.com/design/guidelines),
[accessible interaction](https://www.w3.org/WAI/WCAG22/quickref/),
and [rendering performance](https://web.dev/articles/optimize-lcp).
Use these to improve your execution, not to import someone else's aesthetic.

## Build And Deliver

1. Use the exact user-supplied model label and derive its lowercase hyphenated ID.
   Briefly state your concept, then build it in `src/asif/themes/<id>/` with a
   default `Theme` export and `useAsif()`. Keep theme styles and dependencies scoped.
2. Render the complete canonical collections and capabilities from the content
   contract. Content changes must update every edition. Full text can use accessible
   disclosure; facts, records, and functioning features stay intact.
3. Integrate through `detailPath(version, kind, slug)` and the shared APIs.
   `ResponsiveImage` provides generated cover sizes; originals serve detail views.
   Retain semantic labels, `data-project`, `data-article`, and the optional
   `data-action='show-all-projects'` hook. Equivalent interactions can have
   equivalent tests that preserve coverage rather than force an old layout.
4. Register one completed edition in `src/versions.mjs`: ID, exact model label,
   `/asif/<model-id>/` path, release date, desktop/mobile previews, accent metadata,
   and lazy import. Existing editions, the gallery, and unrelated paths remain
   independent; change shared infrastructure only where integration needs it.
5. Run verification below for every edition without weakening the assertions.
   Inspect your own desktop (1440x1000), mobile (390x844), 320px, tablet, and wide
   layouts. Verify both color modes, readable text, keyboard focus, touch targets,
   reduced motion, complete content, and any experimental feature's fallback.
6. Generate real previews with `npm run screenshots -- --write-public`.
   Commit/push only when authorized. Confirm Actions succeeded and verify the
   public gallery, edition, project/article deep links, and both preview URLs.

## Delivery Checks

```sh
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run screenshots -- --write-public
npm run format:check
```

CI intercepts external form/music services; separately verify integrations when
changing them. Real contact submissions require the owner's permission.

Deliver both: a distinctive authored design and the complete, reliable personal
site. Neither is a substitute for the other.
