# Project Instructions

This repository publishes a gallery at `/` and independent personal-site designs
at `/asif/<model-id>/`. Unrelated projects may use other top-level paths or their
own GitHub Pages repositories. Do not apply personal-site assumptions globally.

## Building A New Edition

Read `.github/skills/build-personal-edition/SKILL.md` before creating a new design.
Full creative freedom is the default. The model owns the art direction: layout,
navigation concept, typography, color, density, imagery, motion, and dimensionality.
Ambitious experiments, real-time 3D, shaders, and new interaction ideas are welcome.
Choose a strong concept and solve the engineering needed to make it work.

The content and capabilities are fixed; the presentation is not. Shared components
and tests are foundations, not a design template. Six semantic sections need not
be six stacked page bands. Creative distinction matters alongside passing checks.
When a brief explicitly requires WebGL/3D, deliver it; a fallback supports the
requested experience rather than replacing it with a simpler effect.

The following boundaries protect content and edition independence, not aesthetics:

- Do not inspect, screenshot, copy, or use `mithawala.com`, the reference checkout's
  presentation code, or existing `src/asif/themes/*` editions as design inspiration.
  Explicit user requests to repair an existing edition are the exception.
- Begin with `content/asif/`, `src/asif/content.mjs`, the neutral shared feature
  APIs, and `docs/content-and-features.md`. These contain everything a new edition
  needs. Do not fetch the old site to obtain content.
- Do not duplicate personal content in a theme. Import canonical records and map
  over the complete collections. No shortened articles, invented claims, omitted
  projects, frozen track lists, or placeholder features.
- Each edition may choose its own layout, visual language, typography, color,
  composition, and motion. A recolor of an earlier edition is not an independent
  design. Do not alter earlier editions or the gallery without a separate need.
- Keep all internal detail links beneath the selected edition's path. Use
  `detailPath()`, not root-level `/project/` or `/blog/` paths.
- Scope styles by a unique edition prefix or `[data-edition='<id>']`. Shared feature
  components can be themed with CSS variables and selectors; shared behavior must
  continue to work for every registered edition.
- Only register real completed editions, using the exact model label supplied by
  the user. Do not invent a model identity or publish fictional future entries.

## Verification

Use Node 22.12+ and npm. Run `npm ci`, `npm test`, `npm run build`,
`npx playwright install chromium`, and `npm run test:e2e`.
Browser tests enumerate the registry and check every edition. Do not weaken them
to make an incomplete theme pass. Keep equivalent accessible names and semantic
test hooks documented in the content contract.

Before publishing, inspect desktop and mobile screenshots, check smaller screens
and keyboard navigation, and verify content completeness. Preview images are real
automated captures, regenerated in CI after the production build.

Publishing is authorized only when the user requests it. Never claim a deployment
is live until the Actions run and both gallery/version URLs have been verified.
Do not include credentials in source, generated assets, logs, or documentation.
