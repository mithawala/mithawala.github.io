# Shared Content And Feature Contract

## Ownership

The content in this repository is independent from the original mithawala.com
deployment. It was imported once from the reference repository, without importing
its theme. Editing this repository does not change the original domain.

Canonical content is managed only in `content/asif/`:

| File                   | Content                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `profile.json`         | Name, roles, photos, biography, 18 expertise areas, services, resume, skills, contacts, and integration settings |
| `portfolio.json`       | Every portfolio record, including full rich descriptions and all media/configuration fields                      |
| `blog.json`            | Every article with its complete HTML body                                                                        |
| `contract.json`        | Required sections, categories, and capabilities                                                                  |
| `import-manifest.json` | Original source revision, migration date/counts, and historical import hashes                                    |

The initial migration contains 52 portfolio entries, 2 articles, 10 jobs, 3 education
entries, 4 services, and 12 measured skills. These are historical counts, not limits.
All content and assets were compared with the source. When new records are added,
tests use current collection lengths instead of freezing these counts.

Shared files are served from `/asif/assets/`, with originals in `public/asif/assets/`.
Do not put personal assets into a model directory. Theme-only decorative assets may
live with their theme. Keep original full-resolution media for detail views.

`npm run dev` and `npm run build` generate shared 400/800/1200px WebP previews
for canonical profile, portfolio, article, and music covers under `/asif/previews/`.
Use `ResponsiveImage` with the original `src`, meaningful `alt`, and a `sizes`
value describing its layout width. This is an optional presentation helper, not
a second content store. External images, animated GIFs, and SVGs retain their
original URLs. Generated previews are ignored by Git and rebuilt in CI; never
edit them or replace the original media used in full-resolution detail viewers.
Restart the dev server after adding or replacing a cover image to refresh its
generated candidates. Every production build regenerates them from the current
canonical records.

## Content Fields

Portfolio fields: `id`, `slug`, `title`, `category`, `categories`, `image`, `type`,
`date`, plus optional `description`, `descriptionHtml`, `technologies`, `links`,
`images`, `galleryMasonry`, `videoUrl`, `portrait`, `embedVideo`, `embedVideos`,
`deviceMockup`, and `fullImage`. Preserve every supplied field. A media-only entry
may intentionally have no written description. Do not invent one.

Article fields: `id`, `slug`, `title`, `category`, `date`, `image`, `content`.
Full articles and rich project descriptions are trusted, repository-authored HTML,
not public user input. Do not insert untrusted external HTML into these fields.

Profile arrays are rendered in full. Dates, employer names, percentages, social
URLs, and contact values are content, not theme constants. Header/section labels
and editorial visual copy may vary by theme without changing factual content.

The SoundCloud playlist is an external source of live track metadata and audio.
Keep its URL in `profile.music.playlistUrl`; do not create a separate hard-coded
track list for each design. SoundCloud returns partial initial metadata, so the
shared player resolves the remaining records while suppressing autoplay.

## Required Capabilities

| Area          | Required behavior                                                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| About         | Complete biography, expertise, all services, social links, rotating roles with reduced-motion support, downloadable CV                                       |
| Resume        | All experience and education, exact descriptions, logos, dates, functional and coding proficiency values                                                     |
| Portfolio     | Every item, all categories, filtering, complete descriptions, technologies, external links                                                                   |
| Media         | Single/multiple YouTube and Vimeo videos, portrait videos, image enlargement, arrow-key gallery navigation, image counter                                    |
| Live projects | Phone/tablet preview modes, embedded app, external launch link for blocked frames                                                                            |
| Sharing       | Version-specific project URLs, LinkedIn/Facebook sharing, copy link with fallback                                                                            |
| Articles      | Every full article, date/category/image, direct address, close/back behavior                                                                                 |
| Search        | Search portfolio titles/descriptions/technologies and full article bodies; open the correct detail                                                           |
| Music         | Full live playlist, artwork, artist, durations, track selection, play/pause, previous/next, seek, volume/mute, expanded view, artwork lightbox, Spotify link |
| Contact       | All contact values, mail/tel links, map, required form fields, real existing FormSubmit endpoint, validation and pending/success/error states                |
| Navigation    | Mobile menu, all sections, active-section indicator, back-to-top, direct details, browser history, explicit gallery link                                     |
| Accessibility | Focus visibility, labeled icons and inputs, keyboard dialogs, nested Escape, reduced motion, contrast, no horizontal overflow                                |
| Appearance    | Light and dark modes, system preference fallback, persistent user preference                                                                                 |

The reference's arbitrary one-second preloader and old CSS are not requirements.
Real loading states are retained. No feature may silently become a decorative
button or a link-only substitute for the existing interactive experience.

## Neutral Feature APIs

- `useAsif()` provides `profile`, `portfolio`, `blog`, `contract`, `version`, `mode`,
  `preference`, `setAppearance`, `openSearch`, `detail`, and `closeDetail`.
- `filterPortfolio`, `searchContent`, `detailPath`, `resolveDetail`, `formatDate`,
  and `formatTime` are pure helpers in `src/asif/content.mjs`.
- `ContactForm` and `useContactForm` preserve the real contact integration.
- `ResponsiveImage` selects generated cover sizes, with native lazy loading by
  default; use `loading="eager"` and `fetchPriority="high"` for a hero image.
- `MusicPlayer` and `useSoundCloud` preserve the live music integration.
  `MusicPlayer` accepts an optional `onPlaybackChange({ playing, title })`
  callback so an edition can reflect playback elsewhere in its design.
- `Dialog`, `ImageLightbox`, `VideoEmbed`, `DevicePreview`, `ProjectDetails`,
  `BlogDetails`, `ShareLinks`, and `RichText` provide accessible feature rendering.

Shared feature styling uses `--paper`, `--ink`, `--muted`, `--line`, `--soft`,
`--accent`, and `--forest` variables. Override those and component selectors within
your edition scope. They are defaults, not a prescribed theme or layout.

## Routes And Registry

`src/versions.mjs` is the only edition registry. The gallery reads it, the router
loads its designs, and screenshot/build/test scripts enumerate it automatically.
IDs and paths are unique; model labels can repeat when the same model builds
another independent iteration. Preserve the original entry and use a unique
iteration-suffixed ID rather than renaming a real model or replacing its work.
Gallery contract checks cover every occurrence of a label and match links by
their registered path; browser suite names include the unique edition ID.

```text
/                                         gallery
/asif/                                    gallery alias
/asif/<model-id>/                          edition
/asif/<model-id>/project/<slug>/            project detail
/asif/<model-id>/blog/<slug>/               article detail
```

Every known route gets a physical HTML file during `npm run build`. GitHub Pages
does not support Vercel rewrites. Do not introduce root-level project/blog routes,
a broad redirect that captures unrelated sites, or a fake-200 404 SPA fallback.

Future unrelated sites can live in separate GitHub Pages repositories and publish
at `/<repository-name>/` without joining this personal-site build.

## Stable Test Hooks

- The six section IDs in `contract.json` must exist, and `main` holds exactly one
  `h1`.
- A portfolio list item has `data-project='<slug>'` and its first link opens the
  record; an article list item has `data-article='<slug>'`. Detail containers have
  `data-detail='<slug>'`.
- If the default portfolio view is shortened, expose a button with
  `data-action='show-all-projects'` that reveals the complete current collection.
- Portfolio filtering is a group named `Portfolio categories` with one button per
  category, named by its capitalized label (`All`, `App`, ... `Cloud`).
- Named controls: a `Search` button; a `Switch to dark mode` / `Switch to light mode`
  button; exactly one link whose name contains `Download CV`; a `meter` named after
  each skill; and, on small screens, a `Menu` button with `aria-expanded` that
  reveals the navigation named `Main navigation`, closes on Escape, and returns
  focus to itself.
- The music player is a region named `Music player` with `data-player-status`. It
  has `Play music`/`Pause music`, `Previous track`, `Next track`, `Mute`/`Unmute`,
  and `Expand music player` buttons, `Seek` and `Volume` sliders, and shows the
  current title in an `h3` inside `.music-now-playing`. Expanded, it is a dialog
  named `Music player` that Escape closes. An `Enlarge music artwork` button opens
  `ImageLightbox` titled `Music`. A custom player built on `useSoundCloud` keeps
  all of these.
- The contact form is named `Contact form`, with fields labeled `Your name`,
  `Email address`, `Subject`, and `Message`, a `Send message` button, and the
  status messages from `useContactForm`. A custom form keeps these too.

These hooks constrain completeness and behavior, not the visual layout.
The six section IDs identify content destinations; they do not prescribe six
stacked bands, a section order, or a navigation style. Spatial and experimental
presentations are welcome. Equivalent accessible interactions may use equivalent
test coverage while preserving every required capability and record.

## Edition Independence

Editions are blind entries: no edition is built with reference to another. Shared
behavior lives in `src/asif/`, and an edition never imports from another edition's
directory. The shared contract tests are `tests/e2e/site.spec.mjs`,
`tests/content.test.mjs`, and `tests/tooling.test.mjs`; they contain no edition's
selectors, labels, or layout. Edition-specific tests are named after their edition
ID (`tests/e2e/<id>.spec.mjs`, `tests/<id>.test.mjs`, or `<id>.<topic>.test.mjs`)
and are not part of the contract. `tests/tooling.test.mjs` enforces both rules.

## External Services And Privacy

SoundCloud, Spotify, YouTube/Vimeo, Google Maps, FormSubmit, and embedded project
sites remain external dependencies. No server or private API key is required by
this static repository. Provider outages or framing restrictions are outside
GitHub Pages; retain graceful errors and external launch links.

FormSubmit delivery may depend on the owner's existing provider activation. CI
intercepts submissions and tests request shape and success/failure UI; it never
sends email. A real delivery smoke test requires the owner's permission.

## CI And Screenshots

Pull requests run content tests, the production build, screenshots, and browser
tests without deploying. Successful pushes to `main` publish the tested artifact.
Failed builds leave the previous deployment intact.

Screenshots are taken from the built edition, using light mode, reduced motion,
fixed desktop/mobile viewports, loaded fonts/images, and no external network.
An edition that renders asynchronously, such as a WebGL scene, marks an element
with `data-rendering` until its first complete frame; capture waits up to 15
seconds for that marker to disappear. Keep a readable fallback in case it never does.
Captures are checked for blank pixels and overflow, converted to WebP, and inserted
into the same deployment artifact. `--write-public` also updates the local/dev
preview copies. Screenshots are generated assets, never content sources.

The edition-builder skill leads with full creative freedom and includes optional
design research. This contract protects completeness and usable interaction;
it does not prescribe the visual language, level of ambition, or rendering medium.
