export const versions = [
  {
    id: 'gpt-6-astra',
    model: 'GPT-6 Astra',
    path: '/asif/gpt-6-astra/',
    released: '2026-09-25',
    preview: '/gallery/previews/gpt-6-astra.webp',
    mobilePreview: '/gallery/previews/gpt-6-astra-mobile.webp',
    color: '#194652',
    load: () => import('./asif/themes/gpt-6-astra/Theme.jsx'),
  },
  {
    id: 'claude-opus-5-5',
    model: 'Claude Opus 5.5',
    path: '/asif/claude-opus-5-5/',
    released: '2026-09-26',
    preview: '/gallery/previews/claude-opus-5-5.webp',
    mobilePreview: '/gallery/previews/claude-opus-5-5-mobile.webp',
    color: '#e3a038',
    load: () => import('./asif/themes/claude-opus-5-5/Theme.jsx'),
  },
]

export const siteOrigin = 'https://mithawala.github.io'
