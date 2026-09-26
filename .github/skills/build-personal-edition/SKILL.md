---
name: build-personal-edition
description: 'Build a blind, independent edition of Asif Mithawala personal website with full creative freedom over its design and interactions. Use when adding a model version, designing a theme, or registering an edition. Earlier editions are off-limits: using one as a reference is cheating. Preserve canonical content and shared capabilities.'
argument-hint: 'Exact model name and optional creative brief'
user-invocable: true
---

# Build An Independent Personal-Site Edition

## Every Edition Is A Blind Entry

Each edition is one model's own answer, made without seeing any other. The gallery
exists to compare independent entries, so using an earlier edition as a reference
is cheating. That includes a quick look, a screenshot, a remembered description,
and looking only to avoid repeating it. An entry shaped by another edition is not
an independent entry.

### Off Limits

Never open, run, render, search, or view any of these while you build:

- `src/asif/themes/*` except the directory you create, and `src/gallery/`.
- Other editions' tests. The shared tests are `tests/e2e/site.spec.mjs`,
  `tests/content.test.mjs`, and `tests/tooling.test.mjs`. Every other test file is
  named after the edition it belongs to.
- Pictures of other editions: their previews in `public/gallery/previews/`, their
  failure captures in `test-results/` and `playwright-report/`, and anything else
  captured from another edition.
- Other editions' pages, built or served: the gallery at `/`, `/asif/<id>/` for
  every ID except yours, their output in `dist/`, and the deployed
  `mithawala.github.io`.
- `mithawala.com` and any checkout of its source.
- Git history about other editions: commit messages, logs, diffs, and blame.
- Descriptions of other editions from earlier conversations, summaries, or memory.

### Keep The Room Clean

- Start each edition in a fresh session. If your context already contains an
  earlier edition, tell the user before you start. Do not reuse anything you
  remember of it: structure, navigation, section order, typography, palette,
  motifs, signature interaction, or wording.
- Search only the shared files listed under Shared Starting Point and your own
  theme directory. Never grep or glob the whole repository or `src/asif/themes/`.
- `package.json` and `src/versions.mjs` reveal other entries' fonts, libraries, and
  accent colors. They are not a palette; choose your own from your concept.
- The build and test commands exercise every edition, and their output names only
  failures. If a shared change breaks another edition, revert or narrow the shared
  change instead of studying that edition.
- Open only captures of your own edition: `<id>.webp`, `<id>-mobile.webp`, and
  screenshots you take of your own pages.
- End your report with a clean-room statement: confirm that you saw no other
  edition, or say exactly what you saw.

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

## Structure Is Part Of The Design

Structure is where independent sites converge most. The familiar portfolio
skeleton is a sticky bar with the name on the left, links in the middle, and icons
on the right; a split hero with a big name beside a picture or 3D scene; the
contract's sections stacked full-width in order; then a footer. It is the path of
least resistance, not a requirement. Treat it as the answer to beat, and decide
from your concept how a visitor arrives, moves, keeps their bearings, and reaches
the work.

The contract names outcomes, not components:

- Mobile menu: on small screens, a control named `Menu` reveals every destination.
  Its form and position are yours.
- Active section: visitors can always tell where they are.
- Back to top: a quick way back to the start.
- Role rotation: the roles take turns, can be paused, and stay still under
  reduced motion.
- Search, appearance, and the gallery link exist with the names the shared tests
  use. Where and how they appear is a design decision.
- The six section IDs are destinations. They need not be six stacked bands, in
  contract order, or reached through a navigation bar.

`MusicPlayer` and `ContactForm` bring a default presentation that looks the same
in every edition that keeps it. When your concept calls for something else, build
it with `useSoundCloud` and `useContactForm`, keeping the accessible names and
hooks listed in the contract.

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

## Shared Starting Point

Start with canonical content and neutral APIs. The content migration is finished
and the repository stands on its own. An explicit request to repair an existing
edition permits inspecting that edition only; it never carries over into building
a new one.

These are the shared files. Read them before you design, and keep every search
inside them and your own theme directory:

1. `AGENTS.md`, `README.md`, and `docs/content-and-features.md`.
2. Every record in `content/asif/`, including full project and article bodies,
   and the shared media in `public/asif/assets/`.
3. `src/asif/content.mjs`, `core.jsx`, `features.jsx`, `Dialog.jsx`,
   `MusicPlayer.jsx`, `images.mjs`, `features.css`, and `music.css`.
4. `src/versions.mjs`, for the registry format only.
5. The shared tests: `tests/e2e/site.spec.mjs`, `tests/content.test.mjs`, and
   `tests/tooling.test.mjs`. They describe behavior, not a layout.
6. Infrastructure, when you need it: `src/App.jsx`, `src/main.jsx`, `src/base.css`,
   `scripts/`, `vite.config.mjs`, `playwright.config.mjs`, `package.json`, and
   `.github/workflows/`.

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
   Never import from another edition's directory.
2. Render the complete canonical collections and capabilities from the content
   contract. Content changes must update every edition. Full text can use accessible
   disclosure; facts, records, and functioning features stay intact.
3. Integrate through `detailPath(version, kind, slug)` and the shared APIs.
   `ResponsiveImage` provides generated cover sizes; originals serve detail views.
   Retain semantic labels, `data-project`, `data-article`, and the optional
   `data-action='show-all-projects'` hook. Equivalent interactions can have
   equivalent tests that preserve coverage rather than force an old layout.
4. Name your own tests after your edition: `tests/e2e/<id>.spec.mjs` and
   `tests/<id>.test.mjs`, or `<id>.<topic>.test.mjs` for more than one file.
5. Register one completed edition in `src/versions.mjs`: ID, exact model label,
   `/asif/<model-id>/` path, release date, desktop/mobile previews, accent metadata,
   and lazy import. Existing editions, the gallery, and unrelated paths remain
   independent; change shared infrastructure only where integration needs it.
6. Run verification below for every edition without weakening the assertions.
   Inspect your own desktop (1440x1000), mobile (390x844), 320px, tablet, and wide
   layouts. Verify both color modes, readable text, keyboard focus, touch targets,
   reduced motion, complete content, and any experimental feature's fallback.
7. Generate real previews with `npm run screenshots -- --write-public`. It
   recaptures every edition; open and commit only your own two files.
8. Commit/push only when authorized. After Actions succeed, verify with HTTP
   requests and DOM queries limited to your own entry, never screenshots of the
   gallery: your gallery label and preview URLs, your edition, and one project and
   one article deep link.

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
site, made without seeing any other entry. Neither is a substitute for the other.
