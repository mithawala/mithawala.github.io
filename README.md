# Asif Mithawala - Editions

A screenshot-led gallery of independently designed personal websites, all powered
by one canonical content library and shared feature implementations.

Each edition owns its presentation; the content and capabilities are shared.
The gallery identifies the model behind each edition alongside real automated
desktop and mobile captures.

- Gallery: https://mithawala.github.io/
- Editions:
  - GPT-6 Astra: https://mithawala.github.io/asif/gpt-6-astra/
  - Claude Opus 5.5: https://mithawala.github.io/asif/claude-opus-5-5/
  - Claude Opus 5: https://mithawala.github.io/asif/claude-opus-5/
  - Claude Opus 5.5 Iteration 2: https://mithawala.github.io/asif/claude-opus-5-5-iteration-2/
  - GPT-6 Astra - The Curiosity Atlas: https://mithawala.github.io/asif/gpt-6-astra-iteration-2/

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
distinguish these entries by path and registry occurrence without dropping
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
