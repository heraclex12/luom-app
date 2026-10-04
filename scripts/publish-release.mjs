// Publish the built release (release.noindex/) to GitHub Releases: creates the v<version> release on the pushed main branch if
// needed and uploads the dmg, zip, blockmaps and latest-mac.yml (the auto-update feed read by src/main/updater.ts).
// Replaces assets that already exist. Used by `npm run release:publish` after `electron-builder --publish never`
// (electron-builder's own upload proved unreliable for the ~140 MB files).
//
// Needs GH_TOKEN (repo scope). Owner / repo come from electron-builder.yml `publish`.
import { readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const yml = readFileSync(join(root, 'electron-builder.yml'), 'utf8')
const owner = /^\s+owner:\s*(\S+)/m.exec(yml)?.[1]
const repo = /^\s+repo:\s*(\S+)/m.exec(yml)?.[1]
const token = process.env.GH_TOKEN
if (!owner || !repo) throw new Error('publish.owner / publish.repo missing in electron-builder.yml')
if (!token) throw new Error('Set GH_TOKEN (a GitHub token with repo scope)')

const tag = `v${version}`
const api = `https://api.github.com/repos/${owner}/${repo}`
const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }

async function gh(path, init = {}) {
  const res = await fetch(path.startsWith('http') ? path : `${api}${path}`, { ...init, headers: { ...headers, ...init.headers } })
  if (!res.ok && res.status !== 404) throw new Error(`${init.method ?? 'GET'} ${path}: ${res.status} ${await res.text()}`)
  return res.status === 404 ? null : res.status === 204 ? {} : res.json()
}

// Binaries first, the update feed (latest-mac.yml) last: installed apps must never see a feed that points at a zip
// that is not uploaded yet.
const files = [
  `Luom-${version}-arm64.zip`,
  `Luom-${version}-arm64.zip.blockmap`,
  `Luom-${version}-arm64.dmg`,
  `Luom-${version}-arm64.dmg.blockmap`,
  'latest-mac.yml',
].map((f) => join(root, 'release.noindex', f))
for (const f of files) if (!existsSync(f)) throw new Error(`Missing ${f}: run the build first`)

// A new release starts as a draft (invisible to the updater) and is published once everything is uploaded.
let release = await gh(`/releases/tags/${tag}`)
if (!release) {
  release = await gh('/releases', {
    method: 'POST',
    body: JSON.stringify({ tag_name: tag, target_commitish: 'main', name: `Lượm ${version}`, draft: true, prerelease: false }),
  })
  console.log(`created draft release ${tag}`)
}

/** Delete an asset of this name if the release has one (a previous version, or a half-finished upload). */
async function removeAsset(name) {
  const fresh = await gh(`/releases/${release.id}`)
  const existing = fresh?.assets.find((a) => a.name === name)
  if (existing) await gh(`/releases/assets/${existing.id}`, { method: 'DELETE' })
}

for (const file of files) {
  const name = file.split('/').pop()
  const body = readFileSync(file)
  for (let attempt = 1; ; attempt++) {
    try {
      await removeAsset(name)
      await gh(`https://uploads.github.com/repos/${owner}/${repo}/releases/${release.id}/assets?name=${encodeURIComponent(name)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(body.length) },
        body,
      })
      console.log(`uploaded ${name} (${(body.length / 1e6).toFixed(1)} MB)`)
      break
    } catch (e) {
      if (attempt >= 3) throw e
      console.warn(`upload ${name} failed (${e.message.slice(0, 120)}), retrying…`)
    }
  }
}

if (release.draft) {
  release = await gh(`/releases/${release.id}`, { method: 'PATCH', body: JSON.stringify({ draft: false }) })
  console.log(`published ${tag}`)
}
console.log(release.html_url)
