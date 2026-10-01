# Asif Mithawala - Editions

A hands-on benchmark of new AI models through independently designed
interpretations of [mithawala.com](https://mithawala.com/). Every model gets the
same personal content and required capabilities, then builds its own design.

Each edition owns its presentation; the content and capabilities are shared.
The gallery identifies the model behind each edition alongside real automated
desktop and mobile captures.

- Gallery: https://mithawala.github.io/
- Editions:
  - GPT-6 Astra: https://mithawala.github.io/asif/gpt-6-astra/
  - Claude Opus 5.5: https://mithawala.github.io/asif/claude-opus-5-5/
  - Claude Opus 5: https://mithawala.github.io/asif/claude-opus-5/
  - Claude Opus 5.5: https://mithawala.github.io/asif/claude-opus-5-5-iteration-2/
  - GPT-6 Astra - The Curiosity Atlas: https://mithawala.github.io/asif/gpt-6-astra-iteration-2/

### Model Editions

Whenever a new AI model comes out, it is put to the same practical test:
create a fresh interpretation of mithawala.com. This collection shows the working
results, making it possible to compare design creativity, implementation quality,
and usability, not just a model's claims or a single screenshot.

Each model starts independently, with the same canonical content and full feature
contract, without seeing earlier editions. The benchmark is qualitative, not a
numerical leaderboard. New completed interpretations are added to the registry.

The landing page keeps its real-time Three.js gallery and actual desktop/mobile
captures, with warm orange accents. Editions rotate automatically on entry;
**Pause motion** stops the rotation and **Resume motion** restarts it. Selecting
a 3D preview or using **Previous edition**, **Next edition**, or arrow keys pauses
automatic browsing on that edition. Rotation also holds while entry controls
are hovered/focused, during comparisons, offscreen, and in hidden tabs, and
respects reduced-motion preferences.

Edition entry links open the websites in new tabs, keeping the gallery available.
The gallery has no missions,
collectibles, rewards, progress tracking, or browser-storage dependency.

Choose **Compare** on two cards, or use **Compare first & latest**. Side-by-side
and draggable-overlay comparison retain desktop/mobile switching and native
keyboard controls. Escape closes each dialog and restores focus. The collection
below the scene always lists every edition in the order they were built; the one
currently shown in the scene is marked **Shown above**.

Three.js is loaded only for the gallery's scene. Graphics-unavailable fallback,
pause, live reduced-motion preferences, and offscreen/hidden-tab suspension are
supported. Prepared desktop/mobile scenes are reused, and preview images load
before the first draw rather than repeatedly recompiling incomplete previews.
Sustained slow frames lower the drawing resolution rather than
blocking interaction. The scene is visual navigation, not a replacement for
accessible DOM content. Preview windows are captures, not live site embeds.

All editions use the same contact map URL. It pins the T-Centralen location in
Stockholm by a verified Google Maps location identifier, explicit center coordinates, and
zoom level 15, rather than depending on a free-text search that can fall back
to the world map.

### The Curiosity Atlas

The second GPT-6 Astra entry is an independent build, not a replacement for the
first. Its interactive sculpture supports dragging, arrow keys, three forms,
pause, and an illustrated graphics-unavailable fallback. Reduced-motion
preferences keep both the sculpture and role rotation still.

Browse the complete project archive in gallery or index view, take a random
project detour, or open search with Ctrl/Cmd+K. The listening room uses the shared
live SoundCloud integration, with a custom turntable, complete playlist, and
keyboard-accessible expanded player. All personal content remains canonical.

## Local Development

Requires Node 22.12+ and npm.

```sh
npm ci
npm run dev
```

Open the Vite URL printed in the terminal. The root is the gallery; each edition
uses its registered `/asif/<model-id>/` path.
The dev and production commands generate responsive WebP cover images from the
canonical originals automatically. No extra content maintenance is required.

## Edit Content Once

Edit `content/asif/profile.json`, `portfolio.json`, or `blog.json`. Add shared
images and downloads under `public/asif/assets/`. Every edition imports these
same records. A successful push to `main` rebuilds and publishes every edition
and refreshes the gallery screenshots.

The original mithawala.com deployment is deliberately independent. The reference
checkout is not needed to develop, build, test, or add future editions.

See [the content and feature contract](docs/content-and-features.md) for field
definitions, routing, external integrations, and the completeness requirements.

## Add A Model Edition

Use [the build-personal-edition skill](.github/skills/build-personal-edition/SKILL.md)
in a fresh session: one model per session. Every edition is a blind entry. The
skill lists the shared files a builder may read; earlier editions, their tests,
previews, and live pages are off-limits, and using them as a reference is cheating.
It starts from content and neutral APIs, not earlier designs. Each edition owns
its presentation, never its own copy of personal content.
Its creative brief gives the model full control over design and interaction,
including ambitious 3D and experimental interfaces. Content, accessibility, and
integration are delivery contracts, not reasons to repeat a safe template.
An explicit WebGL/3D request must be implemented, with appropriate fallbacks.

Register the new component in `src/versions.mjs`. Routes, gallery cards,
screenshots, and cross-edition tests are driven by that registry. Edition-specific
tests are named after the edition ID (`tests/e2e/<id>.spec.mjs`, `tests/<id>.test.mjs`);
the shared contract tests are `tests/e2e/site.spec.mjs`, `tests/content.test.mjs`,
and `tests/tooling.test.mjs`.

Registry IDs and paths identify entries uniquely; model labels retain the exact
supplied model name and may repeat for independent iterations. Browser tests
distinguish these entries by their stable card ID and path without dropping
coverage of either version.

## Verification

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run screenshots -- --write-public
```

`npm run test:e2e` captures real previews before testing the built website on
desktop and mobile. The suite covers content completeness, all asset/detail
URLs, filtering, search, browser history, media, appearance, contact states,
music controls, accessibility, and overflow. External form/music services are
mocked in CI; no test message is actually delivered. Both test runners print
only failures by name, so a builder never reads other editions' test titles.

For a strict local production preview:

```sh
node scripts/serve.mjs
```

## Deployment

The GitHub Actions workflow validates pull requests. Successful pushes to `main`
build, test, regenerate screenshots, upload the static artifact, and deploy with
the official GitHub Pages actions. No secret is required in the workflow.

The repository's Pages source must be **GitHub Actions**. Production is at the
account root; do not add a `/mithawala.github.io/` Vite base path or a `CNAME`
pointing to the existing domain.

Independent projects can have separate repositories and Pages workflows, which
publish under `https://mithawala.github.io/<repository-name>/`.

## Source Provenance

The initial import was taken from the owner's `mithawala/mithawala.com` source.
`content/asif/import-manifest.json` records the exact revision and historical
counts. The importer refuses to overwrite existing canonical data. During the
initial migration, `npm run import:reference -- --verify` compares the imported
records to the local reference; it is not part of normal builds or CI.
