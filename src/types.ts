/** Shared types between host and client. */

export interface GitHubTag {
  name: string
  commit: { sha: string; url: string }
  zipball_url: string
  tarball_url: string
  node_id: string
}

export interface ReleaseInfo {
  /** Normalized semver string, e.g. "0.1.1-rc.1" */
  version: string
  /** Original tag name, e.g. "dsh-v0.1.1-rc.1" */
  tag: string
  /** Human name from GitHub (may be same as tag) */
  name: string
  /** Release page URL */
  url: string
  /** Release notes body */
  body: string
  /** ISO date string */
  publishedAt: string | null
  prerelease: boolean
  /** Whether the tag is a branch-style version (contains '-') */
  isBranch: boolean
}

export interface UpdateCheckResult {
  /** Currently running DSH version */
  currentVersion: string
  /** Latest available version (null if check failed) */
  latestVersion: string | null
  /** True when latestVersion > currentVersion */
  hasUpdate: boolean
  /** Full release metadata (null if no update or check failed) */
  release: ReleaseInfo | null
  /** Error message when the check failed */
  error: string | null
  /** Timestamp (ms) of this check */
  checkedAt: number
}

export const GITHUB_TAGS_API =
  'https://api.github.com/repos/deepseek-ai/deepseek-harness/tags'

export const GITHUB_RELEASES_API =
  'https://api.github.com/repos/deepseek-ai/deepseek-harness/releases'

export const GITHUB_RELEASE_LATEST_API =
  'https://api.github.com/repos/deepseek-ai/deepseek-harness/releases/latest'
