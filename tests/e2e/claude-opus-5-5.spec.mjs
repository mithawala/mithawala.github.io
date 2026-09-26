import { test, expect } from '@playwright/test'
import sharp from 'sharp'
import { profile } from '../../src/asif/content.mjs'
import { versions } from '../../src/versions.mjs'

const edition = versions.find((version) => version.id === 'claude-opus-5-5')

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost', 'mithawala.github.io'].includes(
      new URL(route.request().url()).hostname,
    )
      ? route.continue()
      : route.abort(),
  )
})

async function brightness(buffer) {
  const { channels } = await sharp(buffer).stats()
  return (channels[0].mean + channels[1].mean + channels[2].mean) / 3
}

test.describe('Claude Opus 5.5 lattice room', () => {
  test.skip(!edition, 'Edition is not registered')

  test('renders in WebGL, follows the light, and turns sunlight into lantern light', async ({
    page,
  }) => {
    await page.goto(edition.path)
    const hero = page.locator('.op-hero')
    await expect(hero).toHaveAttribute('data-room', 'ready', {
      timeout: 30000,
    })
    await expect(hero).not.toHaveAttribute('data-rendering', /.+/)
    const canvas = page.locator('.op-canvas')
    const morning = await canvas.screenshot()
    expect((await sharp(morning).stats()).channels[0].stdev).toBeGreaterThan(8)

    const light = page.getByLabel('Move the light')
    await light.focus()
    await light.fill('100')
    await expect
      .poll(async () => Buffer.compare(morning, await canvas.screenshot()))
      .not.toBe(0)

    const day = await brightness(await canvas.screenshot())
    await page
      .getByRole('button', { name: 'Switch to dark mode', exact: true })
      .click()
    await expect
      .poll(async () => brightness(await canvas.screenshot()))
      .toBeLessThan(day - 30)
  })

  test('without WebGL the room is a finished, interactive static composition', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        return /webgl/.test(type) ? null : original.call(this, type, ...rest)
      }
    })
    await page.goto(edition.path)
    const hero = page.locator('.op-hero')
    await expect(hero).toHaveAttribute('data-room', 'fallback')
    await expect(hero).not.toHaveAttribute('data-rendering', /.+/)
    const portrait = page.locator('.op-fallback-frame img')
    await expect(portrait).toBeVisible()
    await expect
      .poll(() => portrait.evaluate((image) => image.naturalWidth))
      .toBeGreaterThan(0)
    await expect(page.locator('.op-placard')).toBeVisible()
    const patch = page.locator('.op-patch')
    const initial = await patch.evaluate((element) => element.style.transform)
    expect(initial).toContain('matrix3d')
    await page.getByLabel('Move the light').fill('0')
    await expect
      .poll(() => patch.evaluate((element) => element.style.transform))
      .not.toBe(initial)
    const shot = await page.locator('.op-stage').screenshot()
    expect((await sharp(shot).stats()).channels[0].stdev).toBeGreaterThan(8)
  })

  test('role rotation can be paused and stops for reduced motion', async ({
    page,
    isMobile,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto(edition.path)
    await page.clock.install()
    const role = page.locator('.op-placard-current')
    await expect(role).toHaveText(profile.roles[0])
    await page
      .getByRole('button', { name: 'Pause role rotation', exact: true })
      .click()
    const paused = await role.textContent()
    await page.clock.fastForward(9000)
    await expect(role).toHaveText(paused)
    await page
      .getByRole('button', { name: 'Resume role rotation', exact: true })
      .click()
    await page.clock.fastForward(4000)
    await expect(role).not.toHaveText(paused)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(
      page.getByRole('button', { name: 'Pause role rotation', exact: true }),
    ).toHaveCount(0)
    if (!isMobile) {
      const frame = await page.locator('.op-fallback-frame').boundingBox()
      const label = await page.locator('.op-placard').boundingBox()
      expect(label.y).toBeGreaterThan(frame.y + frame.height)
    }
  })

  test('career timeline, search shortcut, and the scrolled mobile menu work', async ({
    page,
    isMobile,
  }) => {
    await page.goto(edition.path)
    await expect(page.locator('.op-timeline-row')).toHaveCount(
      profile.resume.experience.length + profile.resume.education.length,
    )
    await page.locator('body').press('/')
    await expect(
      page.getByRole('dialog', { name: 'Search', exact: true }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    if (!isMobile) return
    await page.locator('#music').scrollIntoViewIfNeeded()
    await page.getByRole('button', { name: 'Menu', exact: true }).click()
    const navigation = page.getByRole('navigation', { name: 'Main navigation' })
    const bounds = await navigation.boundingBox()
    expect(bounds.height).toBeGreaterThan(page.viewportSize().height - 2)
    await expect(
      navigation.getByRole('link', { name: 'All editions' }),
    ).toBeVisible()
    await navigation.getByRole('link', { name: 'Contact', exact: true }).click()
    await expect(
      page.getByRole('button', { name: 'Menu', exact: true }),
    ).toHaveAttribute('aria-expanded', 'false')
  })
})
