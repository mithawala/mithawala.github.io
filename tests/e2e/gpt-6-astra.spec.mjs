import { test, expect } from '@playwright/test'
import { portfolio } from '../../src/asif/content.mjs'

const PATH = '/asif/gpt-6-astra/'

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost', 'mithawala.github.io'].includes(
      new URL(route.request().url()).hostname,
    )
      ? route.continue()
      : route.abort(),
  )
})

test.describe('GPT-6 Astra', () => {
  test('the hero portrait loads a generated responsive cover', async ({
    page,
  }) => {
    await page.goto(PATH)
    const hero = page.locator('.astra-portrait img')
    await expect(hero).toBeVisible()
    const selected = await hero.evaluate(async (image) => {
      await image.decode()
      return image.currentSrc
    })
    expect(selected).toContain('/asif/previews/')
  })

  test('index, active navigation, archive collapse, and readable mobile form work', async ({
    page,
  }) => {
    await page.goto(PATH)
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
    await page.goto(PATH)
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
})
