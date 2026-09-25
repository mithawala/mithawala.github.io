# Asif Mithawala - Editions

A screenshot-led gallery of independently designed personal websites, all powered
by one canonical content library and shared feature implementations.

The first edition pairs an oversized typographic masthead, warm paper tones,
an asymmetric project index, and a record-room music section. The gallery is
a separate dark exhibition space. Neither uses the reference site's presentation.

- Gallery: https://mithawala.github.io/
- First edition: https://mithawala.github.io/asif/gpt-6-astra/

## Local Development

Requires Node 22.12+ and npm.

```sh
npm ci
npm run dev
```

Open the Vite URL printed in the terminal. The root is the gallery; each edition
uses its registered `/asif/<model-id>/` path.

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

Use [the build-personal-edition skill](.github/skills/build-personal-edition/SKILL.md).
It starts from content and neutral APIs, not earlier designs. Each edition owns
its presentation, never its own copy of personal content.

Register the new component in `src/versions.mjs`. Routes, gallery cards,
screenshots, and cross-edition tests are driven by that registry.

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
mocked in CI; no test message is actually delivered.

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
