import { test, expect } from '@playwright/test'
import {
  profile,
  portfolio,
  blog,
  contract,
  detailPath,
} from '../../src/asif/content.mjs'
import { versions } from '../../src/versions.mjs'

const version = versions.find(
  (entry) => entry.id === 'claude-opus-5-5-iteration-2',
)
const BOARD_LIMIT = 12

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  )
})

test('the split-flap board names the person and lists every destination', async ({
  page,
}) => {
  await page.goto(version.path)
  await expect(page.locator('main h1')).toHaveAccessibleName(profile.name)
  await expect(page.locator('main h1')).toHaveText(profile.name)
  await expect(page.locator('main h1 .as-flaps')).toHaveAttribute(
    'data-text',
    profile.name,
  )
  const destinations = page.getByRole('list', { name: 'Destinations' })
  await expect(destinations.getByRole('link')).toHaveCount(
    contract.sections.length,
  )
  for (const section of contract.sections)
    await expect(
      destinations.locator(`a[href="#${section.id}"]`),
    ).toContainText(section.label)
  for (const role of profile.roles)
    await expect(page.locator('.as-roles')).toContainText(role)
})

test('roles stay still under reduced motion and rotate on request', async ({
  page,
}) => {
  await page.goto(version.path)
  const roles = page.locator('.as-role-flaps')
  await expect(roles).toHaveAttribute('data-text', profile.roles[0])
  await page.waitForTimeout(5000)
  await expect(roles).toHaveAttribute('data-text', profile.roles[0])
  await page.getByRole('button', { name: 'Play role rotation' }).click()
  await expect(roles).toHaveAttribute('data-text', profile.roles[1], {
    timeout: 6000,
  })
  await page.getByRole('button', { name: 'Pause role rotation' }).click()
  const paused = await roles.getAttribute('data-text')
  await page.waitForTimeout(5000)
  await expect(roles).toHaveAttribute('data-text', paused)
})

test.describe('with motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' })
  test('roles take turns until paused', async ({ page }) => {
    await page.goto(version.path)
    const roles = page.locator('.as-role-flaps')
    await expect(roles).toHaveAttribute('data-text', profile.roles[1], {
      timeout: 7000,
    })
    await page.getByRole('button', { name: 'Pause role rotation' }).click()
    const paused = await roles.getAttribute('data-text')
    await page.waitForTimeout(5000)
    await expect(roles).toHaveAttribute('data-text', paused)
  })
})

test('the location sign follows the reader down the taxi route', async ({
  page,
  isMobile,
}) => {
  await page.goto(version.path)
  await page
    .locator('#portfolio')
    .evaluate((element) => element.scrollIntoView({ block: 'start' }))
  if (isMobile) {
    await expect(page.locator('.as-where')).toContainText('Portfolio')
    return
  }
  const nav = page.getByRole('navigation', { name: 'Main navigation' })
  const here = nav.locator('[aria-current="location"]')
  await expect(here).toHaveCount(1)
  await expect(here).toHaveAttribute('href', '#portfolio')
  await expect(nav.locator('a[href="#about"]')).toHaveClass(/as-sign--behind/)
  await expect(nav.locator('a[href="#contact"]')).toHaveClass(/as-sign--ahead/)
  await page
    .locator('.as-signbar')
    .getByRole('button', { name: 'Back to top' })
    .click()
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(5)
  await expect(page.locator('main h1')).toBeFocused()
  await expect(here).toHaveCount(0)
})

test('the departures board shortens, reveals, and filters the full collection', async ({
  page,
}) => {
  await page.goto(version.path)
  const rows = page.locator('#portfolio [data-project]')
  await expect(rows).toHaveCount(Math.min(BOARD_LIMIT, portfolio.length))
  const reveal = page.locator('[data-action="show-all-projects"]')
  await reveal.click()
  await expect(rows).toHaveCount(portfolio.length)
  await expect(reveal).toHaveCount(0)
  await expect(rows.nth(BOARD_LIMIT).locator('a')).toBeFocused()
  for (const [index, item] of portfolio.entries())
    await expect(rows.nth(index).locator('a')).toHaveAttribute(
      'href',
      detailPath(version, 'project', item.slug),
    )
  const group = page.getByRole('group', { name: 'Portfolio categories' })
  for (const category of contract.categories) {
    const label = category[0].toUpperCase() + category.slice(1)
    const button = group.getByRole('button', { name: label, exact: true })
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(rows).toHaveCount(
      category === 'all'
        ? portfolio.length
        : portfolio.filter((item) => item.categories.includes(category)).length,
    )
  }
})

test('the mobile menu lists the whole route and closes after choosing a stop', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'The sign array is always visible on desktop.')
  await page.goto(version.path)
  const menu = page.getByRole('button', { name: 'Menu', exact: true })
  await menu.click()
  const nav = page.getByRole('navigation', { name: 'Main navigation' })
  for (const section of contract.sections)
    await expect(nav.getByRole('link', { name: section.label })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'All editions' })).toHaveAttribute(
    'href',
    '/',
  )
  await nav.getByRole('link', { name: contract.sections.at(-1).label }).click()
  await expect(menu).toHaveAttribute('aria-expanded', 'false')
  await expect(nav).toBeHidden()
  await expect(page.locator('#contact')).toBeInViewport()
})

test('music, magazines, crew card, and waybill keep their canonical details', async ({
  page,
}) => {
  await page.goto(version.path)
  await expect(
    page.getByRole('link', { name: /Listen on Spotify/ }),
  ).toHaveAttribute('href', profile.music.spotifyUrl)
  await page.getByRole('button', { name: 'Enlarge music artwork' }).click()
  const viewer = page.getByRole('dialog', { name: 'Music image viewer' })
  await expect(viewer.locator('img')).toHaveAttribute(
    'src',
    profile.music.image,
  )
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  for (const post of blog)
    await expect(
      page.locator(`[data-article="${post.slug}"] a`),
    ).toHaveAttribute('href', detailPath(version, 'blog', post.slug))
  const card = page.getByRole('article', { name: 'Crew identification card' })
  await expect(card).toContainText(profile.name)
  for (const role of profile.roles) await expect(card).toContainText(role)
  const contact = page.locator('#contact')
  for (const info of profile.contact.info.filter((entry) => entry.link))
    await expect(contact.locator(`a[href="${info.link}"]`)).toHaveText(
      info.value,
    )
  await expect(contact.locator('iframe')).toHaveAttribute(
    'src',
    profile.contact.mapUrl,
  )
  const gauges = page.locator('#resume .as-gauge')
  await expect(gauges).toHaveCount(
    profile.resume.functionalSkills.length + profile.resume.codingSkills.length,
  )
})

test('keyboard users can skip straight to the content', async ({ page }) => {
  await page.goto(version.path)
  await expect(page.locator('main h1')).toBeVisible()
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Skip to content' })
  await expect(skip).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#as-content')).toBeFocused()
})
