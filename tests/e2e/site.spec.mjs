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
  for (const version of versions) {
    await expect(
      page.getByRole('heading', { name: version.model, exact: true }),
    ).toBeVisible()
    const image = page.getByAltText(`${version.model} personal-site preview`)
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
      page.getByRole('link', { name: `Explore ${version.model}`, exact: true }),
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
    .focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(new RegExp(`${versions[0].path}$`))
})

test('the first model and its preview are visible without scrolling', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: versions[0].model, exact: true }),
  ).toBeInViewport()
  const image = page.getByAltText(`${versions[0].model} personal-site preview`)
  await expect(image).toBeInViewport()
  await expect(
    page.getByRole('link', { name: `Visit ${versions[0].model}`, exact: true }),
  ).toBeInViewport()
  const top = await image.evaluate(
    (element) => element.getBoundingClientRect().top,
  )
  expect(top).toBeLessThan((await page.viewportSize()).height - 100)
})

test('responsive covers are smaller, usable images and full-resolution originals remain available', async ({
  page,
  request,
}) => {
  await page.goto('/asif/gpt-6-astra/')
  const hero = page.locator('.astra-portrait img')
  await expect(hero).toBeVisible()
  const selected = await hero.evaluate(async (image) => {
    await image.decode()
    return image.currentSrc
  })
  expect(selected).toContain('/asif/previews/')
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

test('Astra index, active navigation, archive collapse, and readable mobile form work', async ({
  page,
}) => {
  await page.goto('/asif/gpt-6-astra/')
  await page
    .getByRole('navigation', { name: 'Explore this site' })
    .getByRole('link', { name: /Projects/ })
    .click()
  await expect(
    page.locator('#astra-navigation a[href$="#portfolio"]'),
  ).toHaveAttribute('aria-current', 'location')
  const reveal = page.locator('[data-action="show-all-projects"]')
  await reveal.click()
  await expect(page.locator('[data-project]')).toHaveCount(portfolio.length)
  await reveal.click()
  await expect(page.locator('[data-project]')).toHaveCount(
    Math.min(6, portfolio.length),
  )
  await expect(page.locator('#portfolio h2')).toBeInViewport()
  await page.setViewportSize({ width: 390, height: 844 })
  const input = page
    .getByRole('form', { name: 'Contact form' })
    .getByLabel('Your name', { exact: true })
  expect(
    await input.evaluate((element) =>
      parseFloat(getComputedStyle(element).fontSize),
    ),
  ).toBeGreaterThanOrEqual(16)
  const buttons = page.locator('.astra-nav-tools button')
  for (const button of await buttons.all()) {
    const size = await button.boundingBox()
    expect(size.width).toBeGreaterThanOrEqual(44)
    expect(size.height).toBeGreaterThanOrEqual(44)
  }
})

test('role motion can be paused and reacts to reduced-motion changes', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/asif/gpt-6-astra/')
  await page.clock.install()
  await page
    .getByRole('button', { name: 'Pause role rotation', exact: true })
    .click()
  const role = page.locator('.astra-role')
  const paused = await role.textContent()
  await page.clock.fastForward(9000)
  await expect(role).toHaveText(paused)
  await page
    .getByRole('button', { name: 'Resume role rotation', exact: true })
    .click()
  await page.clock.fastForward(4300)
  await expect(role).not.toHaveText(paused)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(
    page.getByRole('button', { name: 'Pause role rotation', exact: true }),
  ).toHaveCount(0)
  const reduced = await role.textContent()
  await page.clock.fastForward(9000)
  await expect(role).toHaveText(reduced)
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
  test.describe(version.model, () => {
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
