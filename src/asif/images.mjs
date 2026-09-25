import { profile, portfolio, blog } from './content.mjs'

export const previewWidths = [400, 800, 1200]
export const previewSources = [
  ...new Set([
    profile.photo,
    profile.heroPhoto,
    profile.music.image,
    ...portfolio.map((item) => item.image),
    ...blog.map((item) => item.image),
  ]),
].filter((source) => /^\/asif\/assets\/.+\.(jpe?g|png|webp)$/i.test(source))

export function previewPath(source, width) {
  if (!previewSources.includes(source) || !previewWidths.includes(width))
    throw new Error(`Unsupported image preview: ${source} at ${width}px`)
  return `${source.replace('/asif/assets/', '/asif/previews/')}.${width}.webp`
}

export function previewAttributes(source, sizes) {
  if (!previewSources.includes(source)) return { src: source }
  if (!sizes) throw new Error(`Responsive sizes are required for ${source}`)
  return {
    src: source,
    srcSet: previewWidths
      .map((width) => `${previewPath(source, width)} ${width}w`)
      .join(', '),
    sizes,
  }
}
