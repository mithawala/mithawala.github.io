import { chromium } from '@playwright/test'
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { versions } from '../src/versions.mjs'
import { startServer } from './serve.mjs'

const { server, origin } = await startServer()
const browser = await chromium.launch()
try {
  for (const version of versions) {
    for (const viewport of [
      { width: 1440, height: 1000, path: version.preview },
      { width: 390, height: 844, path: version.mobilePreview },
    ]) {
      const context = await browser.newContext({
        viewport,
        deviceScaleFactor: 1,
        reducedMotion: 'reduce',
        colorScheme: 'light',
      })
      await context.addInitScript(() =>
        localStorage.setItem('asif:appearance', 'light'),
      )
      await context.route('**/*', (route) =>
        new URL(route.request().url()).origin === origin
          ? route.continue()
          : route.abort(),
      )
      const page = await context.newPage()
      const response = await page.goto(`${origin}${version.path}`, {
        waitUntil: 'networkidle',
      })
      if (response.status() !== 200)
        throw new Error(`Screenshot route failed: ${version.path}`)
      await page.locator('main h1').waitFor({ state: 'visible' })
      await page.evaluate(async () => {
        await document.fonts.ready
        await Promise.all(
          [...document.images]
            .filter((image) => {
              const bounds = image.getBoundingClientRect()
              return (
                bounds.width > 0 &&
                bounds.height > 0 &&
                bounds.bottom > 0 &&
                bounds.top < innerHeight
              )
            })
            .map((image) => image.decode()),
        )
      })
      // Editions may mark asynchronous rendering (such as WebGL) as pending.
      await page
        .waitForFunction(
          () => !document.querySelector('[data-rendering]'),
          null,
          {
            timeout: 15000,
          },
        )
        .catch(() => {})
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      )
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
      if (overflow)
        throw new Error(
          `Horizontal overflow: ${version.id} at ${viewport.width}px`,
        )
      const image = await page.screenshot({ animations: 'disabled' })
      const stats = await sharp(image).stats()
      if (stats.channels.every((channel) => channel.stdev < 5))
        throw new Error(`Blank screenshot: ${version.id}`)
      const webp = await sharp(image).webp({ quality: 88 }).toBuffer()
      const destinations = [path.join('dist', viewport.path)]
      if (process.argv.includes('--write-public'))
        destinations.push(path.join('public', viewport.path))
      for (const destination of destinations) {
        await mkdir(path.dirname(destination), { recursive: true })
        await writeFile(destination, webp)
      }
      console.log(
        `${version.model}: ${viewport.width}x${viewport.height}, ${Math.round(webp.length / 1024)} KB`,
      )
      await context.close()
    }
  }
} finally {
  await browser.close()
  server.closeAllConnections()
  await new Promise((resolve) => server.close(resolve))
}
