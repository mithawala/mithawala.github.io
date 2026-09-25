---
name: build-personal-edition
description: 'Build a new frontier-model edition of Asif Mithawala personal website. Use when adding a model version, creating a new theme or design, or registering a personal-site edition in the gallery. Requires complete shared content and feature parity without copying earlier designs.'
argument-hint: 'Exact model name and optional design constraints'
user-invocable: true
---

# Build An Independent Personal-Site Edition

## Goal

Create an exceptional original design at `/asif/<model-id>/`, with every piece of
canonical content and every required capability intact. The root gallery shows a
real screenshot and the exact model name. Content changes must update all editions.

## Independence Rule

Do not open the original site, the reference checkout's UI files, existing theme
files, gallery preview images, or earlier screenshots for inspiration. Do not
copy their CSS, composition, typography, section ordering, or markup. This is a
fresh design exercise, not a recolor. The original content migration is finished.
Do not repeat it or depend on a sibling checkout.

When the user explicitly asks to refine an existing edition, inspect and change
only that edition and directly affected infrastructure. This exception does not
permit studying previous editions when building a new one.

You may read the shared infrastructure and content files listed below. Those are
the contract, not a visual reference. Existing editions should remain unchanged.

## Read First

1. `AGENTS.md` and `README.md` at the repository root.
2. `docs/content-and-features.md` for the schema, complete capability checklist,
   routing requirements, and stable browser-test hooks.
3. Every file in `content/asif/`. Read full portfolio and article bodies, not just
   titles or thumbnails. Inspect shared media assets as needed.
4. `src/asif/content.mjs`, `src/asif/core.jsx`, `src/asif/features.jsx`,
   `src/asif/Dialog.jsx`, and `src/asif/MusicPlayer.jsx` for reusable behavior.
5. `src/versions.mjs` for the small registry format, without opening its theme imports.
6. `tests/e2e/site.spec.mjs` for the behavioral contract. It runs for every edition.

## Design Quality Gate

Use design guidance as a way to question your choices, not as a style to import:

- Start with what visitors should understand and do. Make the actual work easy
  to reach; a large introduction should not bury the gallery or its model labels.
- Let the person's real work, images, and interests lead. Explain the purpose of
  a motif before adding it. Remove repeated decoration that competes with content.
- Establish a readable hierarchy and comfortable text measures. Test long
  paragraphs as carefully as the hero. Do not shrink mobile text to make it fit.
- Keep primary controls at least 44px in both dimensions and mobile text inputs
  at least 16px. Keep zoom enabled, focus visible, and menu focus predictable.
- Motion must have a purpose, stop for reduced-motion preferences, and have a
  pause control for persistent automatic updates. Never hide content until an
  animation or observer runs.
- Use `ResponsiveImage` for canonical cover imagery. The build generates shared
  WebP candidates; originals remain available for full-resolution viewers.
- Inspect actual screenshots and interactions before declaring the design done.
  Check model identity/preview visibility, image crops, readable metadata, loading
  behavior, keyboard focus, 320px reflow, and both color modes.

Useful primary sources to consult without copying their layouts or skill text:
[frontend-design principles](https://github.com/anthropics/skills/tree/main/skills/frontend-design),
[interaction guidance](https://vercel.com/design/guidelines),
[W3C target sizes](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html),
and [image/LCP performance](https://web.dev/articles/optimize-lcp).
No palette, typeface, layout, or motion library is prescribed for future editions.

## Procedure

1. Confirm the model label from the user's request. Derive a lowercase, hyphenated
   ID. Ask only when that identity is missing or ambiguous. Never guess which
   model you are. The model name is display metadata supplied by the user.
2. Write down a distinct art direction: type choices, palette, layout rhythm,
   use of real photography/project media, and a small number of meaningful motion
   choices. Design for the actual person and portfolio, not a generic SaaS template.
3. Create only your own directory under `src/asif/themes/<id>/`. Export a default
   React `Theme` component. Obtain data and controls with `useAsif()`.
4. Render all six required sections and all canonical records. Layout, ordering,
   cards vs lists, and presentation are creative decisions. Long content may use
   accessible disclosure, but must never be discarded or rewritten into summaries.
5. Use `detailPath(version, kind, slug)` for project/article links. The shared
   provider supplies search, navigation state, appearance, and full detail views.
   Reuse `ContactForm`, `ImageLightbox`, and `MusicPlayer` or their headless hooks.
   Restyle them to fit your design; do not remove behavior or fork personal data.
6. Preserve the current semantic control labels and `data-project`, `data-article`,
   and optional `data-action='show-all-projects'` hooks. Add equivalent shared tests
   if an interaction genuinely needs a different accessible presentation.
7. Add one entry to `src/versions.mjs`: ID, exact model label, path, release date,
   desktop/mobile preview paths, accent color, and `load: () => import(...)`.
   No gallery markup or hard-coded routing additions should be necessary.
8. Run the verification commands below. Fix your edition or shared regressions;
   never delete records, remove assertions, or skip tests to pass.
9. Inspect your own screenshots at 1440x1000 and 390x844, plus narrow (320px),
   tablet, and wide desktop layouts. Check light/dark modes, focus, dialogs,
   overflow, real images, reduced motion, and touch targets.
10. Generate checked-in development previews with
    `npm run screenshots -- --write-public`. CI independently regenerates its
    own preview artifacts from the finished build on every deployment.
11. Only commit/push when authorized. After deployment, verify `/` and the new
    edition URL, a deep project link, article link, and both screenshot URLs.

## Verification Commands

```sh
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run screenshots -- --write-public
```

The external-provider tests in CI are deterministic and intercepted. Separately
verify the real SoundCloud playlist and embeds when changing integrations. Never
send a real contact message just to test the form without explicit permission.

## Acceptance

- No copied visual design and no changes to previous themes.
- No personal content duplicated in theme source.
- Every section, source record, full text, asset, and capability is represented.
- All shared tests pass for every edition, not only the new one.
- Real, nonblank preview images and a correctly labeled gallery entry.
- Deep links work on GitHub Pages without a catch-all SPA rewrite.
- Unrelated top-level paths remain independent.
