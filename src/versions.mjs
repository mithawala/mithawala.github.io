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
]

export const siteOrigin = 'https://mithawala.github.io'
