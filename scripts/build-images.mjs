import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import {
  previewSources,
  previewWidths,
  previewPath,
} from '../src/asif/images.mjs'

let originalBytes = 0
let previewBytes = 0
for (const source of previewSources) {
  const original = await readFile(
    path.join('public', decodeURIComponent(source)),
  )
  originalBytes += original.length
  const image = sharp(original).rotate()
  await Promise.all(
    previewWidths.map(async (width) => {
      const destination = path.join(
        'public',
        decodeURIComponent(previewPath(source, width)),
      )
      const preview = await image
        .clone()
        .resize({ width })
        .webp({ quality: 85 })
        .toBuffer()
      await mkdir(path.dirname(destination), { recursive: true })
      await writeFile(destination, preview)
      if (width === 800) previewBytes += preview.length
    }),
  )
}
console.log(
  `Prepared ${previewSources.length} responsive covers at ${previewWidths.join('/')}px. 800px covers: ${Math.round(previewBytes / 1024)} KB, originals: ${Math.round(originalBytes / 1024)} KB. Originals preserved.`,
)
