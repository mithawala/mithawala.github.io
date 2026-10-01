import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import sharp from 'sharp'
import {
  profile,
  portfolio,
  blog,
  contract,
  detailPath,
} from '../../src/asif/content.mjs'
import { versions } from '../../src/versions.mjs'
import { previewPath, previewSources } from '../../src/asif/images.mjs'

async function readyGalleryScene(page) {
  await page.locator('.nx-hero').scrollIntoViewIfNeeded()
  await expect(page.locator('.nx-portal-scene')).toHaveAttribute(
    'data-scene-status',
    'ready',
    { timeout: 15000 },
  )
  await expect(page.locator('[data-rendering]')).toHaveCount(0)
}

async function scenePoint(page, kind, id) {
  const scene = page.locator('.nx-portal-scene')
  await expect
    .poll(async () => {
      const points = JSON.parse(await scene.getAttribute(`data-${kind}-points`))
      return points.some((point) => point.id === id && point.visible)
    })
    .toBeTruthy()
  const points = JSON.parse(await scene.getAttribute(`data-${kind}-points`))
  return points.find((point) => point.id === id)
}

async function clickScenePoint(page, kind, id) {
  const canvas = page.locator('.nx-portal-canvas')
  await canvas.scrollIntoViewIfNeeded()
  const point = await scenePoint(page, kind, id)
  const box = await canvas.boundingBox()
  await page.mouse.click(box.x + point.x, box.y + point.y)
}

// The collection lists every edition exactly once, whichever one the hero
// shows, and marks the edition currently in view above.
async function expectCompleteCollection(page) {
  const directory = page.locator('.nx-directory-grid')
  await expect(directory.locator('[data-edition-card]')).toHaveCount(
    versions.length,
  )
  for (const version of versions)
    await expect(
      directory.locator(`[data-edition-card="${version.id}"]`),
    ).toHaveCount(1)
  await expect(page.locator('.nx-active-card')).toHaveCount(1)
  await expect
    .poll(() =>
      page.evaluate(() => {
        const shown =
          document.querySelector('.nx-active-card')?.dataset.editionCard
        const marked = document.querySelector(
          '.nx-directory-grid [aria-current="true"]',
        )?.dataset.editionCard
        return Boolean(shown) && shown === marked
      }),
    )
    .toBeTruthy()
}

test.beforeEach(async ({ context }) => {
  await context.route('**/*', (route) =>
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
  await expectCompleteCollection(page)
  const directory = page.locator('.nx-directory-grid')
  for (const version of versions) {
    const card = directory.locator(`[data-edition-card="${version.id}"]`)
    // Directory previews load lazily, as they would for a visitor scrolling.
    await card.scrollIntoViewIfNeeded()
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
    for (const link of await card.locator(`a[href="${version.path}"]`).all()) {
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(link).toHaveAttribute('rel', /noopener/)
      await expect(link).toHaveAttribute('rel', /noreferrer/)
    }
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy()
})

test('gallery is accessible and keyboard navigation opens an isolated edition tab', async ({
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
    .locator('.nx-directory-grid')
    .getByRole('link', { name: `Explore ${versions[0].model}`, exact: true })
    .and(page.locator(`a[href="${versions[0].path}"]`))
    .focus()
  const galleryUrl = page.url()
  const popupPromise = page.waitForEvent('popup')
  await page.keyboard.press('Enter')
  const popup = await popupPromise
  await expect(popup).toHaveURL(new RegExp(`${versions[0].path}$`))
  expect(await popup.evaluate(() => window.opener === null)).toBeTruthy()
  await expect(page).toHaveURL(galleryUrl)
  await popup.close()
})

test('gallery open-edition actions and comparison links use new tabs', async ({
  page,
}) => {
  await page.goto('/')
  const version = versions[0]
  const popupPromise = page.waitForEvent('popup')
  await page
    .locator('.nx-active-card')
    .getByRole('link', { name: `Visit ${version.model}`, exact: true })
    .click()
  const popup = await popupPromise
  await expect(popup).toHaveURL(new RegExp(`${version.path}$`))
  expect(await popup.evaluate(() => window.opener === null)).toBeTruthy()
  await popup.close()
  await expect(page.locator('.nx-model-editions')).toBeVisible()
  await page
    .getByRole('button', { name: 'Compare first & latest', exact: true })
    .click()
  const dialog = page.getByRole('dialog', {
    name: 'Compare editions',
    exact: true,
  })
  for (const layout of ['Side by side', 'Overlay comparison']) {
    await dialog.getByRole('button', { name: layout, exact: true }).click()
    for (const link of await dialog.locator('a[href^="/asif/"]').all()) {
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(link).toHaveAttribute('rel', /noopener/)
    }
  }
  const comparedPopupPromise = page.waitForEvent('popup')
  await dialog.locator(`a[href="${versions.at(-1).path}"]`).click()
  const comparedPopup = await comparedPopupPromise
  await expect(comparedPopup).toHaveURL(new RegExp(`${versions.at(-1).path}$`))
  expect(
    await comparedPopup.evaluate(() => window.opener === null),
  ).toBeTruthy()
  await comparedPopup.close()
  await expect(dialog).toBeVisible()
})

test('gallery uses orange accents without tinting edition previews', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('.nx-active-card .nx-enter-world')).toHaveCSS(
    'background-color',
    'rgb(255, 152, 0)',
  )
  await expect(
    page.getByRole('button', { name: 'Desktop preview', exact: true }),
  ).toHaveCSS('background-color', 'rgb(255, 152, 0)')
  await expect(page.locator('.nx-hero-copy a')).toHaveCSS(
    'color',
    'rgb(255, 152, 0)',
  )
  await expect(page.locator('.nx-active-card .nx-card-preview img')).toHaveCSS(
    'filter',
    'none',
  )
})

test('the first model and its preview are visible without scrolling', async ({
  page,
}) => {
  await page.goto('/')
  const card = page.locator('.nx-active-card')
  await expect(card).toHaveAttribute('data-edition-card', versions[0].id)
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
  const directory = page.locator('.nx-directory-grid')
  const selectFirst = directory.locator(`[data-compare-select="${first.id}"]`)
  const selectSecond = directory.locator(`[data-compare-select="${second.id}"]`)
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
      directory.locator(`[data-compare-select="${version.id}"]`),
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

test('gallery 3D selects every edition with keyboard and real raycast interaction', async ({
  page,
  isMobile,
}) => {
  await page.goto('/')
  await readyGalleryScene(page)
  const scene = page.locator('.nx-portal-scene')
  const canvas = page.getByRole('group', {
    name: 'Explore editions in 3D',
    exact: true,
  })
  const context = await canvas.evaluate((element) => {
    const gl = element.getContext('webgl2')
    return {
      available: Boolean(gl),
      lost: gl?.isContextLost(),
      width: element.width,
      height: element.height,
    }
  })
  expect(context.available).toBeTruthy()
  expect(context.lost).toBeFalsy()
  expect(context.width).toBeGreaterThan(0)
  expect(context.height).toBeGreaterThan(0)
  expect(
    JSON.parse(await scene.getAttribute('data-portal-points')),
  ).toHaveLength(versions.length)
  await canvas.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.nx-hero')).toHaveAttribute(
    'data-active-edition',
    versions[1].id,
  )
  await expect(page.locator('.nx-active-card')).toHaveAttribute(
    'data-edition-card',
    versions[1].id,
  )
  await expect(page.locator('.nx-announcement')).toContainText(
    versions[1].model,
  )
  await page
    .getByRole('button', { name: 'Previous edition', exact: true })
    .click()
  await expect(page.locator('.nx-hero')).toHaveAttribute(
    'data-active-edition',
    versions[0].id,
  )
  await canvas.focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.nx-active-card')).toHaveAttribute(
    'data-edition-card',
    versions[2].id,
  )
  const target = versions[isMobile ? 2 : 3]
  await clickScenePoint(page, 'portal', target.id)
  await expect(page.locator('.nx-active-card')).toHaveAttribute(
    'data-edition-card',
    target.id,
  )
  for (let index = 0; index < versions.length; index++) {
    await page
      .getByRole('button', { name: 'Next edition', exact: true })
      .click()
    await expectCompleteCollection(page)
  }
})

test('gallery explains the recurring model benchmark without gameplay or saved progress', async ({
  page,
  isMobile,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'asif:nexus-expedition:v1',
      '{"schema":1,"scanned":["gpt-6-astra"],"signals":["origin"],"compared":true}',
    )
    window.__galleryStorageCalls = []
    for (const name of ['getItem', 'setItem', 'removeItem', 'clear']) {
      const original = Storage.prototype[name]
      Storage.prototype[name] = function (...args) {
        window.__galleryStorageCalls.push(name)
        return original.apply(this, args)
      }
    }
  })
  await page.goto('/')
  await readyGalleryScene(page)
  await expect(page.locator('.nx-hero-copy')).toContainText(
    'Whenever a new AI model comes out',
  )
  await expect(page.locator('.nx-hero-copy')).toContainText(
    'create its own interpretation of mithawala.com',
  )
  await expect(page.locator('.nx-hero-copy')).toContainText(
    'Same content. Same capabilities.',
  )
  const explanation = await page.locator('.nx-hero-copy').boundingBox()
  const scene = await page.locator('.nx-portal-canvas').boundingBox()
  expect(explanation.y + explanation.height).toBeLessThan(
    scene.y + scene.height * (isMobile ? 0.3 : 0.25),
  )
  await expect(
    page.getByRole('link', { name: 'About the benchmark', exact: true }),
  ).toHaveAttribute('href', '#about-benchmark')
  await expect(page.locator('#about-benchmark')).toContainText(
    'No previous edition to copy',
  )
  await expect(page.locator('#about-benchmark')).toContainText(
    'qualitative benchmark',
  )
  await expect(page.locator('#about-benchmark')).toContainText(
    'not a numerical leaderboard',
  )
  const forbidden =
    /\b(nexus|expedition|mission|collectible|scanned|uncharted|launch sequence|recover the signals)\b/i
  expect(await page.locator('body').innerText()).not.toMatch(forbidden)
  await expect(
    page.locator(
      '[data-launch-state], [data-signal-points], [data-expedition-complete], [data-scanned], [data-charted]',
    ),
  ).toHaveCount(0)
  await expect(page.getByRole('progressbar')).toHaveCount(0)
  await page.getByRole('button', { name: 'Next edition', exact: true }).click()
  await page
    .getByRole('button', { name: 'Compare first & latest', exact: true })
    .click()
  await expect(
    page.getByRole('dialog', { name: 'Compare editions', exact: true }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  expect(await page.evaluate(() => window.__galleryStorageCalls)).toEqual([])
  await page.reload()
  await readyGalleryScene(page)
  expect(await page.evaluate(() => window.__galleryStorageCalls)).toEqual([])
  await expect(page.locator('.nx-active-card')).toHaveAttribute(
    'data-edition-card',
    versions[0].id,
  )
})

test('gallery remains usable without WebGL or access to browser storage', async ({
  page,
  isMobile,
}) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type.startsWith('webgl') || type === 'experimental-webgl'
        ? null
        : getContext.call(this, type, ...args)
    }
    for (const name of ['getItem', 'setItem', 'removeItem', 'clear'])
      Storage.prototype[name] = () => {
        throw new DOMException('Storage disabled', 'SecurityError')
      }
  })
  await page.goto('/')
  await expect(page.locator('.nx-portal-scene')).toHaveAttribute(
    'data-scene-status',
    'fallback',
  )
  await expect(page.locator('.nx-scene-fallback-message')).toContainText(
    'Edition links remain available',
  )
  await expect(page.locator('.nx-announcement')).toContainText('edition arrows')
  await expect(page.locator('.nx-hero-copy')).toContainText('mithawala.com')
  if (isMobile) {
    const message = await page
      .locator('.nx-scene-fallback-message')
      .boundingBox()
    const controls = await page.locator('.nx-flight-controls').boundingBox()
    expect(message.y + message.height).toBeLessThan(controls.y)
  }
  for (let index = 1; index <= versions.length; index++) {
    await page
      .getByRole('button', { name: 'Next edition', exact: true })
      .click()
    const version = versions[index % versions.length]
    await expect(page.locator('.nx-active-card')).toHaveAttribute(
      'data-edition-card',
      version.id,
    )
    await expect(
      page
        .locator('.nx-active-card')
        .getByRole('link', { name: `Visit ${version.model}`, exact: true }),
    ).toHaveAttribute('href', version.path)
  }
  await expectCompleteCollection(page)
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([])
})

test('gallery 3D pauses motion and responds to live reduced-motion changes', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await readyGalleryScene(page)
  const scene = page.locator('.nx-portal-scene')
  const canvas = page.locator('.nx-portal-canvas')
  await expect(scene).toHaveAttribute('data-scene-motion', 'running')
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click()
  await expect(scene).toHaveAttribute('data-scene-motion', 'paused')
  await page.waitForTimeout(150)
  const paused = await canvas.screenshot()
  await page.waitForTimeout(350)
  expect(paused.equals(await canvas.screenshot())).toBeTruthy()
  await page.getByRole('button', { name: 'Resume motion', exact: true }).click()
  await expect(scene).toHaveAttribute('data-scene-motion', 'running')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(scene).toHaveAttribute('data-scene-motion', 'reduced')
  await expect(
    page.getByRole('button', { name: 'Resume motion', exact: true }),
  ).toBeDisabled()
  await page.waitForTimeout(150)
  const reduced = await canvas.screenshot()
  const activeId = await page
    .locator('.nx-hero')
    .getAttribute('data-active-edition')
  await page.waitForTimeout(350)
  expect(reduced.equals(await canvas.screenshot())).toBeTruthy()
  await expect(page.locator('.nx-hero')).toHaveAttribute(
    'data-active-edition',
    activeId,
  )
})

test('gallery automatically rotates editions on entry and stops when paused', async ({
  page,
}) => {
  // Two real rotation intervals plus traced software-GPU round trips exceed the default test budget.
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await readyGalleryScene(page)
  await page.mouse.move(0, 0)
  const scene = page.locator('.nx-portal-scene')
  await expect(
    page.getByRole('button', { name: 'Pause motion', exact: true }),
  ).toBeEnabled()
  await expect(scene).toHaveAttribute('data-auto-rotation', 'running')
  const activeCard = await page.locator('.nx-active-card').elementHandle()
  const first = await page
    .locator('.nx-hero')
    .getAttribute('data-active-edition')
  await expect(page.locator('.nx-hero')).not.toHaveAttribute(
    'data-active-edition',
    first,
    { timeout: 12000 },
  )
  expect(
    await activeCard.evaluate((element) => element.isConnected),
  ).toBeTruthy()
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click()
  await expect(scene).toHaveAttribute('data-auto-rotation', 'paused')
  const pausedId = await page
    .locator('.nx-hero')
    .getAttribute('data-active-edition')
  const pausedOrbit = Number(await scene.getAttribute('data-orbit'))
  await page.waitForTimeout(8500)
  await expect(page.locator('.nx-hero')).toHaveAttribute(
    'data-active-edition',
    pausedId,
  )
  expect(Number(await scene.getAttribute('data-orbit'))).toBeCloseTo(
    pausedOrbit,
    3,
  )
  await page.getByRole('button', { name: 'Resume motion', exact: true }).click()
  await expect(scene).toHaveAttribute('data-auto-rotation', 'running')
  await expect(page.locator('.nx-hero')).not.toHaveAttribute(
    'data-active-edition',
    pausedId,
    { timeout: 12000 },
  )
  await page.getByRole('button', { name: 'Next edition', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Resume motion', exact: true }),
  ).toBeEnabled()
  await expect(scene).toHaveAttribute('data-auto-rotation', 'paused')
})

test('gallery rotation holds while an entry is being used and honors reduced motion', async ({
  page,
  isMobile,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await readyGalleryScene(page)
  await page.mouse.move(0, 0)
  const scene = page.locator('.nx-portal-scene')
  await page.locator('.nx-active-card .nx-enter-world').focus()
  await expect(scene).toHaveAttribute('data-auto-rotation', 'paused')
  const focusedId = await page
    .locator('.nx-hero')
    .getAttribute('data-active-edition')
  await page.waitForTimeout(1000)
  await expect(page.locator('.nx-hero')).toHaveAttribute(
    'data-active-edition',
    focusedId,
  )
  await page.locator('.nx-about-link').focus()
  await expect(scene).toHaveAttribute('data-auto-rotation', 'running')
  if (!isMobile) {
    await page.locator('.nx-active-card').hover()
    await expect(scene).toHaveAttribute('data-auto-rotation', 'paused')
    await page.mouse.move(0, 0)
    await expect(scene).toHaveAttribute('data-auto-rotation', 'running')
  }
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(scene).toHaveAttribute('data-auto-rotation', 'reduced')
  await expect(
    page.getByRole('button', { name: 'Resume motion', exact: true }),
  ).toBeDisabled()
  const reducedId = await page
    .locator('.nx-hero')
    .getAttribute('data-active-edition')
  await page.waitForTimeout(1000)
  await expect(page.locator('.nx-hero')).toHaveAttribute(
    'data-active-edition',
    reducedId,
  )
})

test('gallery 3D reduces rendering cost after sustained slow frames', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const request = window.requestAnimationFrame
    window.requestAnimationFrame = (callback) =>
      request(() => {
        const start = performance.now()
        while (performance.now() - start < 80) {}
        callback(performance.now())
      })
  })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await readyGalleryScene(page)
  const scene = page.locator('.nx-portal-scene')
  await expect
    .poll(async () => Number(await scene.getAttribute('data-render-scale')))
    .toBeLessThan(1)
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click()
  const scale = Number(await scene.getAttribute('data-render-scale'))
  expect(scale).toBeGreaterThanOrEqual(0.5)
  await expect(scene).toHaveAttribute('data-scene-status', 'ready')
  await expectCompleteCollection(page)
})

test('gallery 3D switches real preview textures and recovers from a lost graphics context', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__galleryShaderLinks = 0
    const link = WebGL2RenderingContext.prototype.linkProgram
    WebGL2RenderingContext.prototype.linkProgram = function (...args) {
      window.__galleryShaderLinks++
      return link.apply(this, args)
    }
  })
  await page.goto('/')
  await readyGalleryScene(page)
  const canvas = page.locator('.nx-portal-canvas')
  const desktop = await canvas.screenshot()
  await page
    .getByRole('button', { name: 'Mobile preview', exact: true })
    .click()
  await readyGalleryScene(page)
  await expect
    .poll(async () => desktop.equals(await canvas.screenshot()))
    .toBeFalsy()
  const preparedPrograms = await page.evaluate(
    () => window.__galleryShaderLinks,
  )
  await page
    .getByRole('button', { name: 'Desktop preview', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Mobile preview', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Desktop preview', exact: true })
    .click()
  await readyGalleryScene(page)
  expect(await page.evaluate(() => window.__galleryShaderLinks)).toBe(
    preparedPrograms,
  )
  await expect(page.locator('.nx-active-card img')).toHaveAttribute(
    'src',
    versions[0].preview,
  )
  const originalPixels = await sharp(desktop).ensureAlpha().raw().toBuffer()
  await expect
    .poll(async () => {
      const pixels = await sharp(await canvas.screenshot())
        .ensureAlpha()
        .raw()
        .toBuffer()
      expect(pixels.length).toBe(originalPixels.length)
      let difference = 0
      for (let index = 0; index < pixels.length; index++)
        difference += Math.abs(pixels[index] - originalPixels[index])
      return difference / pixels.length
    })
    .toBeLessThan(0.02)
  await canvas.evaluate((element) => {
    const gl = element.getContext('webgl2')
    const extension = gl.getExtension('WEBGL_lose_context')
    if (!extension)
      throw new Error('Chromium does not expose WebGL context-loss testing')
    extension.loseContext()
  })
  await expect(page.locator('.nx-portal-scene')).toHaveAttribute(
    'data-scene-status',
    'fallback',
  )
  await expect(page.locator('[data-rendering]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Next edition', exact: true }).click()
  await expect(page.locator('.nx-active-card')).toHaveAttribute(
    'data-edition-card',
    versions[1].id,
  )
  await expectCompleteCollection(page)
})

test('gallery 3D touch travel leaves vertical page scrolling available', async ({
  page,
  isMobile,
}) => {
  if (!isMobile) return
  await page.goto('/')
  await readyGalleryScene(page)
  const session = await page.context().newCDPSession(page)
  const canvas = page.locator('.nx-portal-canvas')
  let box = await canvas.boundingBox()
  const y = box.y + box.height * 0.48
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: box.x + box.width * 0.75, y }],
  })
  for (const fraction of [0.65, 0.5, 0.35, 0.2])
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: box.x + box.width * fraction, y }],
    })
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  })
  await expect(page.locator('.nx-hero')).not.toHaveAttribute(
    'data-active-edition',
    versions[0].id,
  )
  const activeId = await page
    .locator('.nx-hero')
    .getAttribute('data-active-edition')
  const beforeScroll = await page.evaluate(() => scrollY)
  box = await canvas.boundingBox()
  const x = box.x + box.width / 2
  const startY = box.y + box.height * 0.52
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y: startY }],
  })
  for (const delta of [20, 60, 110, 160])
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: startY - delta }],
    })
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  })
  await expect
    .poll(() => page.evaluate(() => scrollY))
    .toBeGreaterThan(beforeScroll + 20)
  await expect(page.locator('.nx-hero')).toHaveAttribute(
    'data-active-edition',
    activeId,
  )
  await session.detach()
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
    test('the contact map shows the shared Stockholm area without a pin', async ({
      page,
    }) => {
      await page.goto(`${version.path}#contact`)
      const map = page.locator('#contact iframe[src*="google.com/maps"]')
      await expect(map).toHaveCount(1)
      const disclosure = map.locator('xpath=ancestor::details[1]')
      if (
        (await disclosure.count()) &&
        !(await disclosure.evaluate((element) => element.open))
      )
        await disclosure.locator(':scope > summary').click()
      await map.scrollIntoViewIfNeeded()
      await expect(map).toBeVisible()
      await expect(map).toHaveAttribute('src', profile.contact.mapUrl)
      const source = new URL(await map.getAttribute('src'))
      expect(source.searchParams.get('ll')).toBe('59.3381,18.0308')
      expect(source.searchParams.get('z')).toBe('14')
      expect(source.searchParams.has('q')).toBe(false)
      expect(source.searchParams.has('cid')).toBe(false)
      const box = await map.boundingBox()
      expect(box.width).toBeGreaterThan(150)
      expect(box.height).toBeGreaterThan(150)
    })

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
