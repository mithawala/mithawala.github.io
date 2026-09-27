import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { portfolio, profile } from '../../src/asif/content.mjs'

const path = '/asif/gpt-6-astra-iteration-2/'

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) =>
    ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  )
})

test('Astra atlas sculpture is real WebGL with distinct forms and keyboard controls', async ({
  page,
}) => {
  await page.goto(path)
  const scene = page.locator('.ca-scene')
  await expect(scene).toHaveAttribute('data-scene-status', 'ready')
  await expect(page.locator('[data-rendering]')).toHaveCount(0)
  const canvas = scene.locator('canvas')
  const initial = await canvas.screenshot()
  await page.waitForTimeout(250)
  expect(initial.equals(await canvas.screenshot())).toBeTruthy()
  await page.getByRole('button', { name: 'Orbit', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Orbit', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect
    .poll(async () => initial.equals(await canvas.screenshot()))
    .toBeFalsy()
  const orbit = await canvas.screenshot()
  await page
    .getByRole('button', { name: 'Rotate sculpture right', exact: true })
    .click()
  await expect
    .poll(async () => orbit.equals(await canvas.screenshot()))
    .toBeFalsy()
  await page
    .getByRole('button', { name: 'Reset sculpture', exact: true })
    .click()
  const stage = scene.getByRole('group', {
    name: 'Rotate the sculpture',
    exact: true,
  })
  const resetYaw = await scene.getAttribute('data-scene-yaw')
  await stage.focus()
  await page.keyboard.press('ArrowRight')
  await expect(scene).not.toHaveAttribute('data-scene-yaw', resetYaw)
  await page.keyboard.press('Home')
  await expect(scene).toHaveAttribute('data-scene-yaw', resetYaw)
  await page.getByRole('button', { name: 'Bloom', exact: true }).click()
  await expect
    .poll(async () => orbit.equals(await canvas.screenshot()))
    .toBeFalsy()
})

test('Astra atlas retains a usable illustration when graphics are unavailable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(type)) return null
      return original.call(this, type, ...args)
    }
  })
  await page.goto(path)
  const scene = page.locator('.ca-scene')
  await expect(scene).toHaveAttribute('data-scene-status', 'fallback')
  await expect(page.locator('[data-rendering]')).toHaveCount(0)
  await expect(scene.locator('.ca-scene-illustration')).toBeVisible()
  await page.getByRole('button', { name: 'Bloom', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Bloom', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Take a detour', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`${path}project/`))
  const slug = await page.locator('[data-detail]').getAttribute('data-detail')
  expect(portfolio.some((item) => item.slug === slug)).toBeTruthy()
})

test('Astra atlas index, filtering, biography and keyboard search stay complete', async ({
  page,
}) => {
  await page.goto(path)
  await expect(page.locator('#ca-person-name')).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('link', { name: 'Skip to content', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#ca-main')).toBeFocused()
  await page.locator('[data-action="show-all-projects"]').click()
  await page.getByRole('button', { name: 'Index view', exact: true }).click()
  await expect(page.locator('.ca-projects')).toHaveAttribute(
    'data-view',
    'index',
  )
  await expect(page.locator('[data-project]')).toHaveCount(portfolio.length)
  const urls = await page
    .locator('[data-project] a')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')))
  expect(urls.every((url) => url.startsWith(`${path}project/`))).toBeTruthy()
  await page.getByRole('textbox', { name: 'Filter projects' }).fill('WebRTC')
  await expect(page.locator('[data-project]')).toHaveCount(1)
  await expect(page.locator('[data-project]')).toHaveAttribute(
    'data-project',
    'voicecom',
  )
  await page.getByRole('textbox', { name: 'Filter projects' }).fill('')
  await page.locator('.ca-biography-more > summary').click()
  await expect(page.locator('.ca-biography-more')).toHaveAttribute('open', '')
  for (const skill of profile.about.skills)
    await expect(page.getByText(skill, { exact: true })).toBeVisible()
  await page.keyboard.press('Control+k')
  await expect(
    page.getByRole('dialog', { name: 'Search', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('textbox', { name: 'Search portfolio and articles' })
    .fill('Two-Way Door')
  await page
    .getByRole('dialog', { name: 'Search', exact: true })
    .getByRole('link')
    .first()
    .click()
  await expect(page).toHaveURL(`${path}blog/1234-days-at-aws/`)
})

test('Astra atlas pause and live reduced-motion preferences stop the whole hero', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto(path)
  await expect(page.locator('.ca-atlas')).toHaveAttribute(
    'data-motion',
    'running',
  )
  await expect(page.locator('.ca-scene')).toHaveAttribute(
    'data-scene-status',
    'ready',
  )
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click()
  await expect(page.locator('.ca-atlas')).toHaveAttribute(
    'data-motion',
    'paused',
  )
  const role = await page.locator('[data-rotating-role]').textContent()
  const canvas = page.locator('.ca-scene canvas')
  await page.waitForTimeout(150)
  const paused = await canvas.screenshot()
  await page.waitForTimeout(3800)
  expect(paused.equals(await canvas.screenshot())).toBeTruthy()
  await expect(page.locator('[data-rotating-role]')).toHaveText(role)
  await page.getByRole('button', { name: 'Resume motion', exact: true }).click()
  await expect(page.locator('[data-rotating-role]')).not.toHaveText(role, {
    timeout: 6000,
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('.ca-atlas')).toHaveAttribute(
    'data-motion',
    'reduced',
  )
  await expect(
    page.getByRole('button', { name: 'Resume motion', exact: true }),
  ).toBeDisabled()
  const reducedRole = await page.locator('[data-rotating-role]').textContent()
  await page.waitForTimeout(3800)
  await expect(page.locator('[data-rotating-role]')).toHaveText(reducedRole)
})

test('Astra atlas expanded content and index layout remain accessible', async ({
  page,
}) => {
  await page.goto(path)
  await page.locator('.ca-biography-more > summary').click()
  await page.getByRole('button', { name: 'Index view', exact: true }).click()
  await page.locator('[data-action="show-all-projects"]').click()
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(
    result.violations.map(({ id, nodes }) => ({
      id,
      targets: nodes.map((node) => node.target),
    })),
  ).toEqual([])
  await page.setViewportSize({ width: 320, height: 844 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy()
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  const navigation = page.getByRole('navigation', { name: 'Main navigation' })
  for (const name of [
    'About',
    'Portfolio',
    'Music',
    'Resume',
    'Blog',
    'Contact',
  ])
    await expect(
      navigation.getByRole('link', { name, exact: true }),
    ).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('button', { name: 'Menu', exact: true }),
  ).toBeFocused()
})

test('Astra atlas phone hero controls are not covered by notes or the navigation dock', async ({
  page,
}) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto(path, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    const visibility = await page.evaluate(() => {
      const dock = document.querySelector('.ca-dock').getBoundingClientRect()
      const cta = document
        .querySelector('.ca-primary-link')
        .getBoundingClientRect()
      const controls = [
        ...document.querySelectorAll('.ca-scene-control'),
        ...document.querySelectorAll('.ca-shape-selector button'),
        document.querySelector('.ca-primary-link'),
      ]
      return {
        gap: dock.top - cta.bottom,
        blocked: controls
          .filter((control) => {
            const box = control.getBoundingClientRect()
            return !control.contains(
              document.elementFromPoint(
                box.x + box.width / 2,
                box.y + box.height / 2,
              ),
            )
          })
          .map(
            (control) =>
              control.getAttribute('aria-label') || control.textContent,
          ),
      }
    })
    expect(visibility.gap).toBeGreaterThanOrEqual(4)
    expect(visibility.blocked).toEqual([])
  }
})
