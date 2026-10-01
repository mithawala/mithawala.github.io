import { test, expect } from '@playwright/test'
import { portfolio } from '../../src/asif/content.mjs'
import { buildMap } from '../../src/asif/themes/claude-opus-5/map.mjs'

const PATH = '/asif/claude-opus-5/'
const { nodes } = buildMap(portfolio)

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost', 'mithawala.github.io'].includes(
      new URL(route.request().url()).hostname,
    )
      ? route.continue()
      : route.abort(),
  )
})

// Sweeps the map window until a marker answers, then reports where it was.
async function findMarker(page, box) {
  for (let x = box.x + 8; x < box.x + box.width - 8; x += 9)
    for (let y = box.y + 8; y < box.y + box.height - 8; y += 9) {
      await page.mouse.move(x, y)
      if (await page.locator('.o5-readout').count()) return { x, y }
    }
  return null
}

test.describe('Claude Opus 5 latent map', () => {
  test('the map renders in WebGL and every work can be read and opened from it', async ({
    page,
  }) => {
    await page.goto(PATH)
    const field = page.locator('.o5-field')
    await expect(field).toHaveAttribute('data-field', 'live')
    await expect(page.locator('.o5-field canvas')).toBeVisible()
    await expect(field).not.toHaveAttribute('data-rendering', /.*/)

    const box = await page
      .locator('[data-window="masthead"] .o5-window-area')
      .boundingBox()
    const marker = await findMarker(page, box)
    expect(marker, 'no marker answered the pointer').not.toBeNull()
    const label = await page.locator('.o5-readout').innerText()
    expect(nodes.some((node) => label.includes(node.title))).toBeTruthy()

    await page.mouse.click(marker.x, marker.y)
    await expect(page).toHaveURL(new RegExp(`${PATH}project/`))
    await expect(page.getByRole('dialog')).toHaveCount(1)
  })

  test('dragging turns the configuration', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(PATH)
    await expect(page.locator('.o5-field')).toHaveAttribute(
      'data-field',
      'live',
    )
    await page.locator('#portfolio').scrollIntoViewIfNeeded()
    await page.locator('[data-project="voicecom"] a').hover()
    const readout = page.locator('.o5-readout')
    await expect(readout).toContainText('VoiceCom')
    const before = await readout.evaluate((element) => element.style.transform)

    const area = page.locator('[data-window="works"] .o5-window-area')
    const box = await area.boundingBox()
    const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    await page.mouse.move(centre.x, centre.y)
    await page.mouse.down()
    await page.mouse.move(centre.x - 150, centre.y - 50, { steps: 12 })
    await page.mouse.up()
    await page.locator('[data-project="voicecom"] a').hover()
    await expect
      .poll(() => readout.evaluate((element) => element.style.transform))
      .not.toBe(before)
  })

  test('the filter narrows both the list and the map', async ({ page }) => {
    await page.goto(PATH)
    await page.locator('#portfolio').scrollIntoViewIfNeeded()
    const cloud = portfolio.filter((item) => item.categories.includes('cloud'))
    await page
      .getByRole('group', { name: 'Portfolio categories' })
      .getByRole('button', { name: 'Cloud', exact: true })
      .click()
    await expect(page.locator('[data-project]')).toHaveCount(cloud.length)
    await expect(page.locator('[data-window="works"]')).toContainText(
      `${cloud.length}/${portfolio.length}`,
    )
    await expect(page.getByRole('status').first()).toContainText('in Cloud')
  })

  test('hovering a catalogue row labels its marker on the map', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'the readout is a pointer affordance')
    await page.goto(PATH)
    await expect(page.locator('.o5-field')).toHaveAttribute(
      'data-field',
      'live',
    )
    await page.locator('#portfolio').scrollIntoViewIfNeeded()
    await expect(page.locator('.o5-readout')).toHaveCount(0)
    await page.locator('[data-project="voicecom"] a').hover()
    const readout = page.locator('.o5-readout')
    await expect(readout).toContainText('VoiceCom')
    const position = portfolio.findIndex((item) => item.slug === 'voicecom')
    await expect(readout).toContainText(String(position + 1).padStart(3, '0'))
    await page.locator('#portfolio h2').hover()
    await expect(readout).toHaveCount(0)
  })

  test('without WebGL the map is still drawn and the page stays complete', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    await context.route('**/*', (route) =>
      ['127.0.0.1', 'localhost', 'mithawala.github.io'].includes(
        new URL(route.request().url()).hostname,
      )
        ? route.continue()
        : route.abort(),
    )
    await context.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        return type === 'webgl2' ? null : original.call(this, type, ...rest)
      }
    })
    const page = await context.newPage()
    await page.goto(PATH)
    await expect(page.locator('.o5-field')).toHaveAttribute(
      'data-field',
      'static',
    )
    await expect(page.locator('.o5-static')).toBeVisible()
    await expect(page.locator('.o5-static circle')).toHaveCount(
      portfolio.length,
    )
    await expect(page.locator('main h1')).toContainText('Asif')
    await page.locator('[data-action="show-all-projects"]').click()
    await expect(page.locator('[data-project]')).toHaveCount(portfolio.length)
    await context.close()
  })

  test('role rotation pauses and reduced motion removes the control', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto(PATH)
    await page.clock.install()
    const role = page.locator('.o5-role')
    await page.getByRole('button', { name: 'Pause role rotation' }).click()
    const held = await role.textContent()
    await page.clock.fastForward(9000)
    await expect(role).toHaveText(held)
    await page.getByRole('button', { name: 'Resume role rotation' }).click()
    await page.clock.fastForward(4000)
    await expect(role).not.toHaveText(held)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(
      page.getByRole('button', { name: /role rotation/ }),
    ).toHaveCount(0)
  })

  test('navigation, search shortcut, and mobile menu focus behave', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(PATH)
    const menu = page.getByRole('button', { name: 'Menu', exact: true })
    for (const control of await page.locator('.o5-tools button').all()) {
      const size = await control.boundingBox()
      expect(size.width).toBeGreaterThanOrEqual(44)
      expect(size.height).toBeGreaterThanOrEqual(44)
    }
    await menu.click()
    const navigation = page.getByRole('navigation', { name: 'Main navigation' })
    await expect(navigation).toBeVisible()
    await expect(
      navigation.getByRole('link', { name: /All editions/ }),
    ).toHaveAttribute('href', '/')
    await navigation.getByRole('link', { name: /Record/ }).click()
    await expect(page.locator('#resume')).toBeInViewport()
    await expect(
      page.locator('#o5-navigation a[href$="#resume"]'),
    ).toHaveAttribute('aria-current', 'location')
    await menu.click()
    await page.keyboard.press('Escape')
    await expect(menu).toHaveAttribute('aria-expanded', 'false')
    await expect(menu).toBeFocused()

    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.locator('#portfolio h2').click()
    await page.keyboard.press('/')
    await expect(page.getByRole('dialog', { name: 'Search' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('the record keeps every position readable at full length', async ({
    page,
  }) => {
    await page.goto(PATH)
    const records = page.locator('#resume .o5-record')
    await expect(records).toHaveCount(13)
    const body = page.locator('#resume .o5-record-body').first()
    expect((await body.innerText()).length).toBeGreaterThan(400)
    const meters = page.getByRole('meter')
    await expect(meters).toHaveCount(12)
    const width = await meters
      .first()
      .evaluate((element) => element.getBoundingClientRect().width)
    expect(width).toBeGreaterThan(80)
  })
})
