import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sirv from 'sirv'

export function startServer(port = 0) {
  const handler = sirv('dist', {
    dev: true,
    single: false,
    onNoMatch: (request, response) => {
      response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
      response.end(readFileSync('dist/404.html'))
    },
  })
  const server = createServer(handler)
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () =>
      resolve({ server, origin: `http://127.0.0.1:${server.address().port}` }),
    )
  })
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { server, origin } = await startServer(Number(process.env.PORT || 4173))
  console.log(`Static preview: ${origin}`)
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () => {
      server.closeAllConnections()
      server.close(() => process.exit(0))
    })
}
