import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {
  profile,
  portfolio,
  blog,
  contract,
  detailPath,
} from '../../src/asif/content.mjs'
import { versions } from '../../src/versions.mjs'
import { previewPath, previewSources } from '../../src/asif/images.mjs'

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost', 'mithawala.github.io'].includes(
      new URL(route.request().url()).hostname,
    )
      ? route.continue()
      : route.abort(),
  )
})

test('gallery shows real previews, model labels, and correct version links', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    profile.name,
  )
  await expect(page.locator('[data-edition-card]')).toHaveCount(versions.length)
  for (const version of versions) {
    const card = page.locator(`[data-edition-card="${version.id}"]`)
    await expect(
      card.getByRole('heading', { name: version.model, exact: true }),
    ).toBeVisible()
    const image = card.getByAltText(`${version.model} personal-site preview`)
    await expect(image).toBeVisible()
    await expect
      .poll(() => image.evaluate((element) => element.naturalWidth))
      .toBe(1440)
    await page
      .getByRole('button', { name: 'Mobile preview', exact: true })
      .click()
    await expect
      .poll(() => image.evaluate((element) => element.naturalWidth))
      .toBe(390)
    await page
      .getByRole('button', { name: 'Desktop preview', exact: true })
      .click()
    await expect(
      card.getByRole('link', { name: `Explore ${version.model}`, exact: true }),
    ).toHaveAttribute('href', version.path)
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy()
})

test('gallery is accessible and keyboard navigation enters the edition', async ({
  page,
}) => {
  await page.goto('/')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('link', { name: 'Skip to editions' }),
  ).toBeFocused()
  await page.keyboard.press('Enter')
  await page
    .getByRole('link', { name: `Explore ${versions[0].model}`, exact: true })
    .and(page.locator(`a[href="${versions[0].path}"]`))
    .focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(new RegExp(`${versions[0].path}$`))
})

test('the first model and its preview are visible without scrolling', async ({
  page,
}) => {
  await page.goto('/')
  const card = page.locator(`[data-edition-card="${versions[0].id}"]`)
  await expect(
    card.getByRole('heading', { name: versions[0].model, exact: true }),
  ).toBeInViewport()
  const image = card.getByAltText(`${versions[0].model} personal-site preview`)
  await expect(image).toBeInViewport()
  await expect(
    card.getByRole('link', { name: `Visit ${versions[0].model}`, exact: true }),
  ).toBeInViewport()
  const top = await image.evaluate(
    (element) => element.getBoundingClientRect().top,
  )
  expect(top).toBeLessThan((await page.viewportSize()).height - 100)
})

test('gallery selects distinct editions for a keyboard-accessible comparison', async ({
  page,
}) => {
  await page.goto('/')
  const [first, second] = [versions.at(-1), versions[0]]
  const selectFirst = page.locator(`[data-compare-select="${first.id}"]`)
  const selectSecond = page.locator(`[data-compare-select="${second.id}"]`)
  await selectFirst.click()
  const tray = page.getByRole('complementary', { name: 'Selected editions' })
  await expect(tray.getByRole('status')).toContainText('1 of 2 selected')
  await expect(
    tray.getByRole('button', { name: 'Compare editions', exact: true }),
  ).toBeDisabled()
  await selectSecond.click()
  await expect(selectFirst).toHaveAttribute('aria-pressed', 'true')
  await expect(selectSecond).toHaveAttribute('aria-pressed', 'true')
  for (const version of versions.filter(
    (entry) => ![first.id, second.id].includes(entry.id),
  ))
    await expect(
      page.locator(`[data-compare-select="${version.id}"]`),
    ).toBeDisabled()
  await tray
    .getByRole('button', { name: 'Compare editions', exact: true })
    .click()
  const dialog = page.getByRole('dialog', {
    name: 'Compare editions',
    exact: true,
  })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Left edition', { exact: true })).toHaveValue(
    first.id,
  )
  await expect(dialog.getByLabel('Right edition', { exact: true })).toHaveValue(
    second.id,
  )
  await expect(dialog.locator('[data-comparison-edition]')).toHaveCount(2)
  for (const version of [first, second]) {
    const image = dialog.locator(
      `[data-comparison-edition="${version.id}"] img`,
    )
    await expect
      .poll(() => image.evaluate((element) => element.naturalWidth))
      .toBe(1440)
    await expect(dialog.locator(`a[href="${version.path}"]`)).toBeVisible()
  }
  await dialog
    .getByRole('button', { name: 'Comparison mobile preview', exact: true })
    .click()
  for (const image of await dialog
    .locator('[data-comparison-edition] img')
    .all())
    await expect
      .poll(() => image.evaluate((element) => element.naturalWidth))
      .toBe(390)
  const replacement = versions.find(
    (entry) => ![first.id, second.id].includes(entry.id),
  )
  await dialog
    .getByLabel('Left edition', { exact: true })
    .selectOption(replacement.id)
  await expect(
    dialog.locator(`[data-comparison-edition="${replacement.id}"]`),
  ).toBeVisible()
  await expect(
    dialog
      .getByLabel('Right edition', { exact: true })
      .locator(`option[value="${replacement.id}"]`),
  ).toHaveJSProperty('disabled', true)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(
    tray.getByRole('button', { name: 'Compare editions', exact: true }),
  ).toBeFocused()
  await tray
    .getByRole('button', { name: /^Remove / })
    .first()
    .click()
  await expect(tray.getByRole('button', { name: /^Remove / })).toHaveCount(1)
  await expect(tray.getByRole('button', { name: /^Remove / })).toBeFocused()
  await tray.getByRole('button', { name: /^Remove / }).click()
  await expect(tray).toHaveCount(0)
  await expect(page.locator('#editions')).toBeFocused()
  await selectFirst.click()
  await selectSecond.click()
  await tray
    .getByRole('button', { name: 'Clear comparison selection', exact: true })
    .click()
  await expect(tray).toHaveCount(0)
  await expect(page.locator('#editions')).toBeFocused()
  await expect(page.locator('[data-compare-select]:disabled')).toHaveCount(0)
})

test('gallery overlay compares real captures at exact reveal positions', async ({
  page,
  isMobile,
}) => {
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Compare first & latest', exact: true })
    .click()
  const dialog = page.getByRole('dialog', {
    name: 'Compare editions',
    exact: true,
  })
  await dialog
    .getByRole('button', { name: 'Overlay comparison', exact: true })
    .click()
  const stage = dialog.locator('.gx-wipe-stage')
  await expect(stage).toHaveAttribute('data-viewport', 'desktop')
  await expect(stage.locator('img')).toHaveCount(2)
  await expect(stage.locator('.gx-wipe-left img')).toHaveAttribute(
    'src',
    versions[0].preview,
  )
  await expect(stage.locator(':scope > img')).toHaveAttribute(
    'src',
    versions.at(-1).preview,
  )
  const slider = dialog.getByRole('slider', {
    name: 'Reveal left edition',
    exact: true,
  })
  await slider.fill('25')
  await expect(stage.locator('.gx-wipe-left')).toHaveCSS(
    'clip-path',
    'inset(0px 75% 0px 0px)',
  )
  await slider.focus()
  await page.keyboard.press('ArrowRight')
  await expect(slider).toHaveValue('26')
  await expect(stage.locator('.gx-wipe-left')).toHaveCSS(
    'clip-path',
    'inset(0px 74% 0px 0px)',
  )
  await dialog
    .getByRole('button', { name: 'Comparison mobile preview', exact: true })
    .click()
  await expect(stage).toHaveAttribute('data-viewport', 'mobile')
  await expect(stage.locator('.gx-wipe-left img')).toHaveAttribute(
    'src',
    versions[0].mobilePreview,
  )
  for (const image of await stage.locator('img').all())
    await expect
      .poll(() => image.evaluate((element) => element.naturalWidth))
      .toBe(390)
  await slider.fill('0')
  await expect(stage.locator('.gx-wipe-left')).toHaveCSS(
    'clip-path',
    'inset(0px 100% 0px 0px)',
  )
  await slider.fill('100')
  await expect(stage.locator('.gx-wipe-left')).toHaveCSS(
    'clip-path',
    'inset(0px 0% 0px 0px)',
  )
  await stage.scrollIntoViewIfNeeded()
  const box = await stage.boundingBox()
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2, {
    steps: 6,
  })
  await page.mouse.up()
  await expect(slider).toHaveValue('80')
  await page.keyboard.press('ArrowLeft')
  await expect(slider).toHaveValue('79')
  if (isMobile) {
    const session = await page.context().newCDPSession(page)
    const start = { x: box.x + box.width * 0.3, y: box.y + box.height / 2 }
    const end = { x: box.x + box.width * 0.6, y: box.y + box.height / 2 }
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [start],
    })
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [end],
    })
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    })
    await expect(slider).toHaveValue('60')
    await session.detach()
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy()
})

test('gallery comparison remains usable on a 320px screen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Compare first & latest', exact: true })
    .click()
  const dialog = page.getByRole('dialog', {
    name: 'Compare editions',
    exact: true,
  })
  for (const mode of ['Side by side', 'Overlay comparison']) {
    await dialog.getByRole('button', { name: mode, exact: true }).click()
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBeTruthy()
    await expect(
      dialog.getByLabel('Left edition', { exact: true }),
    ).toBeVisible()
    await expect(
      dialog.getByLabel('Right edition', { exact: true }),
    ).toBeVisible()
  }
  await page.keyboard.press('Escape')
  const tray = page.getByRole('complementary', { name: 'Selected editions' })
  const box = await tray.boundingBox()
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(320)
  await tray
    .getByRole('button', { name: 'Clear comparison selection', exact: true })
    .click()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy()
})

test('responsive cover previews are much smaller and full-resolution originals remain available', async ({
  request,
}) => {
  let originals = 0
  let previews = 0
  for (const source of [
    profile.heroPhoto,
    ...portfolio.slice(0, 6).map((item) => item.image),
  ]) {
    if (!previewSources.includes(source)) continue
    const original = await request.get(source)
    const preview = await request.get(previewPath(source, 800))
    expect(original.status()).toBe(200)
    expect(preview.status()).toBe(200)
    expect(preview.headers()['content-type']).toContain('image/webp')
    originals += (await original.body()).length
    previews += (await preview.body()).length
  }
  expect(previews).toBeLessThan(originals * 0.35)
})

for (const width of [320, 768, 1920])
  test(`gallery and editions fit a ${width}px screen without clipped headings`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 })
    for (const path of ['/', ...versions.map((version) => version.path)]) {
      await page.goto(path)
      await expect(page.locator('main h1')).toBeVisible()
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy()
      const headings = await page
        .locator('main h1, main h2')
        .evaluateAll((elements) =>
          elements.map((element) => {
            const bounds = element.getBoundingClientRect()
            return {
              text: element.textContent,
              fits:
                bounds.left >= 0 &&
                bounds.right <= innerWidth &&
                element.scrollWidth <= element.clientWidth + 1,
            }
          }),
        )
      expect(headings.filter((heading) => !heading.fits)).toEqual([])
    }
  })

for (const version of versions)
  test.describe(`${version.model} [${version.id}]`, () => {
    test('all canonical content is present and all portfolio entries are reachable', async ({
      page,
    }) => {
      await page.goto(version.path)
      for (const section of contract.sections)
        await expect(page.locator(`#${section.id}`)).toBeAttached()
      const reveal = page.locator('[data-action="show-all-projects"]')
      if (await reveal.count()) await reveal.click()
      await expect(page.locator('[data-project]')).toHaveCount(portfolio.length)
      for (const record of portfolio)
        await expect(
          page.locator(`[data-project="${record.slug}"]`),
        ).toContainText(record.title)
      await expect(page.locator('[data-article]')).toHaveCount(blog.length)
      const about = page.locator('#about')
      for (const paragraph of profile.about.intro.split('\n\n'))
        await expect(about).toContainText(paragraph)
      for (const paragraph of profile.about.experience.split('\n\n'))
        await expect(about).toContainText(paragraph)
      for (const skill of profile.about.skills)
        await expect(about).toContainText(skill)
      for (const service of profile.services) {
        await expect(about).toContainText(service.title)
        await expect(about).toContainText(service.description)
      }
      for (const entry of [
        ...profile.resume.experience,
        ...profile.resume.education,
      ]) {
        await expect(page.locator('#resume')).toContainText(entry.title)
        await expect(page.locator('#resume')).toContainText(entry.description)
      }
      for (const skill of [
        ...profile.resume.functionalSkills,
        ...profile.resume.codingSkills,
      ])
        await expect(
          page.getByRole('meter', { name: skill.name, exact: true }),
        ).toHaveAttribute('value', String(skill.value))
      await expect(
        page.getByRole('link', { name: /Download CV/ }),
      ).toHaveAttribute('href', profile.about.cvLink)
      for (const url of Object.values(profile.social))
        await expect(page.locator(`a[href="${url}"]`).first()).toBeAttached()
      for (const info of profile.contact.info)
        await expect(page.locator('#contact')).toContainText(info.value)
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy()
    })

    test('portfolio categories and shared search open the correct records', async ({
      page,
    }) => {
      await page.goto(version.path)
      await page
        .getByRole('group', { name: 'Portfolio categories' })
        .getByRole('button', { name: 'Cloud', exact: true })
        .click()
      await expect(page.locator('[data-project]')).toHaveCount(
        portfolio.filter((item) => item.categories.includes('cloud')).length,
      )
      await page.getByRole('button', { name: 'Search', exact: true }).click()
      await page
        .getByRole('textbox', { name: 'Search portfolio and articles' })
        .fill('VoiceCom')
      await page
        .getByRole('dialog', { name: 'Search', exact: true })
        .getByRole('link')
        .first()
        .click()
      await expect(page).toHaveURL(
        new RegExp(`${version.path}project/voicecom/`),
      )
      await expect(page.locator('[data-detail="voicecom"]')).toContainText(
        'Sonoff NSPanel Pro',
      )
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)
    })

    test('project images, nested Escape, device previews, and share URLs work', async ({
      page,
    }) => {
      const item = portfolio.find((entry) => entry.slug === 'bookmark-manager')
      const response = await page.goto(
        detailPath(version, 'project', item.slug),
      )
      expect(response.status()).toBe(200)
      await expect(
        page.getByRole('dialog').getByRole('heading', { level: 1 }),
      ).toHaveText(item.title)
      await page
        .getByRole('button', {
          name: `Enlarge ${item.title} image 1`,
          exact: true,
        })
        .click()
      await page
        .getByRole('button', { name: 'Next image', exact: true })
        .click()
      await expect(
        page.getByText(`2 / ${item.images.length}`, { exact: true }),
      ).toBeVisible()
      await page.keyboard.press('ArrowLeft')
      await expect(
        page.getByText(`1 / ${item.images.length}`, { exact: true }),
      ).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(1)
      await page
        .getByRole('button', { name: 'iPhone preview', exact: true })
        .click()
      await expect(
        page.getByRole('button', { name: 'iPhone preview', exact: true }),
      ).toHaveAttribute('aria-pressed', 'true')
      await page
        .getByRole('button', { name: 'Load live preview', exact: true })
        .click()
      await expect(
        page.locator('iframe[title$="live preview"]'),
      ).toHaveAttribute('src', item.deviceMockup.url)
      await expect(
        page.getByRole('link', { name: 'Share on LinkedIn', exact: true }),
      ).toHaveAttribute(
        'href',
        new RegExp(
          encodeURIComponent(
            `https://mithawala.github.io${detailPath(version, 'project', item.slug)}`,
          ),
        ),
      )
      await page.reload()
      await expect(page.locator(`[data-detail="${item.slug}"]`)).toBeVisible()
    })

    test('video entries, multi-video projects, and full article bodies are retained', async ({
      page,
    }) => {
      const video = portfolio.find(
        (entry) =>
          entry.type === 'video' && entry.videoUrl.includes('youtube.com'),
      )
      await page.goto(detailPath(version, 'project', video.slug))
      await page
        .getByRole('button', { name: `Play ${video.title}`, exact: true })
        .click()
      await expect(page.locator('.video-embed iframe')).toHaveCount(1)
      const vimeo = portfolio.find(
        (entry) =>
          entry.type === 'video' && entry.videoUrl.includes('vimeo.com'),
      )
      await page.goto(detailPath(version, 'project', vimeo.slug))
      await expect(page.locator('.video-embed iframe')).toHaveAttribute(
        'src',
        vimeo.videoUrl,
      )
      const multiVideo = portfolio.find(
        (entry) => entry.embedVideos?.length > 1,
      )
      await page.goto(detailPath(version, 'project', multiVideo.slug))
      await expect(page.locator('.video-embed')).toHaveCount(
        multiVideo.embedVideos.length,
      )
      for (const post of blog) {
        await page.goto(detailPath(version, 'blog', post.slug))
        await expect(page.locator('.blog-detail h1')).toHaveText(post.title)
        const rendered = await page
          .locator('.blog-detail .rich-content')
          .innerText()
        const expected = await page.evaluate((html) => {
          const element = document.createElement('div')
          element.innerHTML = html
          return element.textContent.replace(/\s+/g, ' ').trim()
        }, post.content)
        expect(rendered.replace(/\s+/g, ' ').trim()).toBe(expected)
      }
    })

    test('back navigation, appearance preference, and responsive menu work', async ({
      page,
      isMobile,
    }) => {
      await page.goto(version.path)
      await page
        .getByRole('button', { name: 'Switch to dark mode', exact: true })
        .click()
      await expect(page.locator('[data-edition]')).toHaveAttribute(
        'data-mode',
        'dark',
      )
      await page.reload()
      await expect(page.locator('[data-edition]')).toHaveAttribute(
        'data-mode',
        'dark',
      )
      await page
        .getByRole('button', { name: 'Switch to light mode', exact: true })
        .click()
      if (isMobile) {
        await page.getByRole('button', { name: 'Menu', exact: true }).click()
        await expect(
          page.getByRole('navigation', { name: 'Main navigation' }),
        ).toBeVisible()
        await page.keyboard.press('Escape')
        await expect(
          page.getByRole('button', { name: 'Menu', exact: true }),
        ).toHaveAttribute('aria-expanded', 'false')
        await expect(
          page.getByRole('button', { name: 'Menu', exact: true }),
        ).toBeFocused()
      }
      await page.locator('[data-project="voicecom"] a').first().click()
      await expect(page.getByRole('dialog')).toHaveCount(1)
      await page.goBack()
      await expect(page.getByRole('dialog')).toHaveCount(0)
    })

    test('contact form validates and handles success and failure without real delivery', async ({
      page,
    }) => {
      let requestBody = ''
      await page.route(profile.contact.endpoint, (route) => {
        requestBody = route.request().postData() || ''
        return route.fulfill({ json: { success: true } })
      })
      await page.goto(version.path)
      const form = page.getByRole('form', { name: 'Contact form' })
      expect(
        await form.evaluate((element) => element.checkValidity()),
      ).toBeFalsy()
      async function fillForm() {
        await form.getByLabel('Your name', { exact: true }).fill('Test Runner')
        await form
          .getByLabel('Email address', { exact: true })
          .fill('test@example.com')
        await form
          .getByLabel('Subject', { exact: true })
          .fill('Local browser verification')
        await form
          .getByLabel('Message', { exact: true })
          .fill('This request is intercepted by Playwright and is never sent.')
      }
      await fillForm()
      await form
        .getByRole('button', { name: 'Send message', exact: true })
        .click()
      await expect(form.getByRole('status')).toContainText('Message sent')
      expect(requestBody).toContain('Local browser verification')
      await expect(form.getByLabel('Your name', { exact: true })).toHaveValue(
        '',
      )
      await page.route(profile.contact.endpoint, (route) =>
        route.fulfill({ status: 500, json: { success: false } }),
      )
      await fillForm()
      await form
        .getByRole('button', { name: 'Send message', exact: true })
        .click()
      await expect(form.getByRole('alert')).toContainText('could not be sent')
    })

    test('music controls preserve all interactions using the widget contract', async ({
      page,
    }) => {
      const sounds = [
        {
          id: 1,
          title: 'First test track',
          duration: 180000,
          artwork_url: profile.music.image,
          user: { username: profile.name },
        },
        {
          id: 2,
          title: 'Second test track',
          duration: 240000,
          artwork_url: profile.music.image,
          user: { username: profile.name },
        },
      ]
      await page.route('https://w.soundcloud.com/player/api.js', (route) =>
        route.fulfill({
          contentType: 'application/javascript',
          body: `
      window.__musicCalls = [];
      const sounds = ${JSON.stringify(sounds)};
      const events = Object.fromEntries(['READY','PLAY','PAUSE','PLAY_PROGRESS','FINISH','ERROR'].map(name => [name,name]));
      function Widget() {
        const listeners = {}; let index = 0; let playing = false;
        const emit = (name, value) => listeners[name]?.(value);
        return {
          bind(name, callback) { listeners[name] = callback; if(name === 'READY') queueMicrotask(callback); },
          unbind(name) { delete listeners[name]; },
          getSounds(callback) { callback([sounds[0], { id: sounds[1].id }]); },
          getCurrentSound(callback) { callback(sounds[index]); },
          getCurrentSoundIndex(callback) { callback(index); },
          setVolume(value) { window.__musicCalls.push(['volume',value]); },
          seekTo(value) { window.__musicCalls.push(['seek',value]); emit('PLAY_PROGRESS',{currentPosition:value}); },
          skip(value) { index=value; window.__musicCalls.push(['skip',value]); },
          play() { playing=true; emit('PLAY'); },
          pause() { playing=false; emit('PAUSE'); },
          toggle() { playing=!playing; emit(playing?'PLAY':'PAUSE'); }
        };
      }
      Widget.Events=events; window.SC={Widget};
    `,
        }),
      )
      await page.route('https://w.soundcloud.com/player/?**', (route) =>
        route.fulfill({
          contentType: 'text/html',
          body: '<!doctype html><html><body></body></html>',
        }),
      )
      await page.goto(version.path)
      await page.locator('#music').scrollIntoViewIfNeeded()
      const player = page.getByRole('region', {
        name: 'Music player',
        exact: true,
      })
      await expect(player).toHaveAttribute('data-player-status', 'ready')
      await page
        .getByRole('button', { name: 'Play music', exact: true })
        .click()
      await expect(
        page.getByRole('button', { name: 'Pause music', exact: true }),
      ).toBeEnabled()
      await page
        .getByRole('button', { name: 'Next track', exact: true })
        .click()
      await expect(page.locator('.music-now-playing h3')).toHaveText(
        'Second test track',
      )
      await page
        .getByRole('slider', { name: 'Seek', exact: true })
        .fill('60000')
      await page.getByRole('slider', { name: 'Volume', exact: true }).fill('35')
      await page.getByRole('button', { name: 'Mute', exact: true }).click()
      await expect(
        page.getByRole('slider', { name: 'Volume', exact: true }),
      ).toHaveValue('0')
      await page.getByRole('button', { name: 'Unmute', exact: true }).click()
      await expect(
        page.getByRole('slider', { name: 'Volume', exact: true }),
      ).toHaveValue('35')
      await page
        .getByRole('button', { name: 'Expand music player', exact: true })
        .click()
      await expect(
        page.getByRole('dialog', { name: 'Music player', exact: true }),
      ).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(
        page.getByRole('region', { name: 'Music player', exact: true }),
      ).toBeVisible()
      expect(await page.evaluate(() => window.__musicCalls)).toContainEqual([
        'seek',
        60000,
      ])
      await page
        .getByRole('button', { name: 'Enlarge music artwork', exact: true })
        .click()
      await expect(
        page.getByRole('dialog', { name: 'Music image viewer', exact: true }),
      ).toBeVisible()
    })

    test('basic accessibility and layout pass in light and dark mode', async ({
      page,
    }) => {
      await page.goto(version.path)
      for (const mode of ['light', 'dark']) {
        if (mode === 'dark')
          await page
            .getByRole('button', { name: 'Switch to dark mode', exact: true })
            .click()
        const audit = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
        expect(
          audit.violations.map((violation) => ({
            id: violation.id,
            impact: violation.impact,
            nodes: violation.nodes.map((node) => node.target),
          })),
        ).toEqual([])
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBeTruthy()
      }
    })
  })

test('all generated detail URLs and local assets return HTTP 200', async ({
  request,
}) => {
  for (const version of versions)
    for (const [kind, records] of [
      ['project', portfolio],
      ['blog', blog],
    ]) {
      for (const record of records)
        expect(
          (await request.get(detailPath(version, kind, record.slug))).status(),
        ).toBe(200)
    }
  const assets = new Set()
  function collect(value) {
    if (typeof value === 'string' && value.startsWith('/asif/assets/'))
      assets.add(value)
    else if (Array.isArray(value)) value.forEach(collect)
    else if (value && typeof value === 'object')
      Object.values(value).forEach(collect)
  }
  collect({ profile, portfolio, blog })
  for (const asset of assets)
    expect((await request.get(asset)).status(), asset).toBe(200)
  expect((await request.get('/not-a-real-route/')).status()).toBe(404)
})
