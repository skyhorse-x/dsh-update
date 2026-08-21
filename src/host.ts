/**
 * dsh-update host plugin.
 *
 * Registers an HTTP endpoint on the webserver that checks GitHub for new
 * DSH versions. The client plugin polls this endpoint and shows a notification.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve as resolvePath } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { compareVersions, parseVersion } from './semver.js'
import {
  GITHUB_TAGS_API,
  type GitHubTag,
  type ReleaseInfo,
  type UpdateCheckResult,
} from './types.js'

declare module '@deepseek-ai/cordis' {
  interface Context {
    webServer: {
      register(route: { kind: string; path: string; handler: (req: any, res: any) => Promise<void> }): () => void
    }
  }
}

const PLUGIN_NAME = 'dsh-update'

/** How long (ms) to cache a check result before re-fetching from GitHub. */
const CACHE_TTL_MS = 5 * 60 * 1000

/** Read the currently installed DSH version from the host's package.json. */
function getCurrentVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url))
    let dir = here
    for (let i = 0; i < 8; i++) {
      const candidate = resolvePath(dir, 'package.json')
      try {
        const pkg = JSON.parse(readFileSync(candidate, 'utf8')) as {
          name?: string
          version?: string
        }
        if (pkg.name && pkg.name.includes('harness') && pkg.version) {
          return pkg.version
        }
      } catch {
        // not found or unreadable — keep walking
      }
      const parent = dirname(dir)
      if (parent === dir) break
      dir = parent
    }
  } catch {
    // fall through
  }
  return '0.0.0'
}

/** Strip a `dsh-v` or `v` prefix to get a plain semver string. */
function normalizeTag(tag: string): string {
  return tag.replace(/^dsh-v/, '').replace(/^v/, '')
}

/** Determine whether a tag looks like a valid semver-ish version. */
function isVersionTag(tag: string): boolean {
  return parseVersion(normalizeTag(tag)) !== null
}

/** Fetch all tags from the deepseek-harness repository. */
async function fetchTags(): Promise<GitHubTag[]> {
  const resp = await fetch(GITHUB_TAGS_API, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': PLUGIN_NAME,
    },
  })
  if (!resp.ok) {
    throw new Error(`GitHub tags API returned HTTP ${resp.status}`)
  }
  return (await resp.json()) as GitHubTag[]
}

/** Pick the highest semver tag from a list of GitHub tags. */
function pickLatest(tags: GitHubTag[]): GitHubTag | null {
  let latest: GitHubTag | null = null
  let latestVersion: string | null = null

  for (const tag of tags) {
    const v = normalizeTag(tag.name)
    if (!isVersionTag(tag.name)) continue
    if (latestVersion === null || compareVersions(v, latestVersion) > 0) {
      latest = tag
      latestVersion = v
    }
  }

  return latest
}

/** Convert a GitHub tag into our ReleaseInfo shape. */
function tagToRelease(tag: GitHubTag): ReleaseInfo {
  const version = normalizeTag(tag.name)
  return {
    version,
    tag: tag.name,
    name: tag.name,
    url: `https://github.com/deepseek-ai/deepseek-harness/releases/tag/${encodeURIComponent(tag.name)}`,
    body: '',
    publishedAt: null,
    prerelease: version.includes('-'),
    isBranch: version.includes('-'),
  }
}

/** Core check logic: fetch tags, compare to current version. */
async function checkForUpdate(
  currentVersion: string,
): Promise<UpdateCheckResult> {
  const checkedAt = Date.now()

  try {
    const tags = await fetchTags()
    const latest = pickLatest(tags)

    if (!latest) {
      return {
        currentVersion,
        latestVersion: null,
        hasUpdate: false,
        release: null,
        error: null,
        checkedAt,
      }
    }

    const release = tagToRelease(latest)
    const hasUpdate = compareVersions(release.version, currentVersion) > 0

    return {
      currentVersion,
      latestVersion: release.version,
      hasUpdate,
      release,
      error: null,
      checkedAt,
    }
  } catch (err) {
    return {
      currentVersion,
      latestVersion: null,
      hasUpdate: false,
      release: null,
      error: err instanceof Error ? err.message : String(err),
      checkedAt,
    }
  }
}

// ── Cordis plugin ──────────────────────────────────────────────────────────

export const name = PLUGIN_NAME

export function apply(ctx: Context) {
  let cache: UpdateCheckResult | null = null
  let cacheExpiry = 0
  let disposeRoute: (() => void) | undefined

  /** Serve the /api/dsh-update/check endpoint. */
  async function handleCheck(req: any, res: any): Promise<void> {
    const now = Date.now()

    if (cache && now < cacheExpiry) {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(cache))
      return
    }

    const currentVersion = getCurrentVersion()
    const result = await checkForUpdate(currentVersion)
    cache = result
    cacheExpiry = now + CACHE_TTL_MS

    if (result.hasUpdate) {
      try {
        ctx.logger?.info(
          '[%s] new DSH version available: %s → %s',
          PLUGIN_NAME,
          result.currentVersion,
          result.latestVersion,
        )
      } catch {
        // logger may not be available; ignore
      }
    }

    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify(result))
  }

  // Register the route once the webserver is available (lazy injection).
  ctx.inject(['webServer'], (webCtx) => {
    disposeRoute = webCtx.webServer.register({
      kind: 'exact',
      path: '/api/dsh-update/check',
      handler: handleCheck,
    })

    try {
      ctx.logger?.info('[%s] registered /api/dsh-update/check', PLUGIN_NAME)
    } catch {
      // ignore
    }

    return () => {
      if (disposeRoute) {
        disposeRoute()
        disposeRoute = undefined
      }
    }
  })
}
