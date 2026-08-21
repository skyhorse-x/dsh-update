/**
 * Minimal semver comparison utilities.
 * Supports: `X.Y.Z`, `X.Y.Z-prerelease`, with optional `v` prefix.
 */

const SEMVER_RE = /^v?(\d+)\.(\d+)\.(\d+)(?:[-.]?([0-9A-Za-z.-]+))?$/

export interface ParsedVersion {
  major: number
  minor: number
  patch: number
  prerelease: string | null
}

export function parseVersion(version: string): ParsedVersion | null {
  const match = SEMVER_RE.exec(version.trim())
  if (!match) return null
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? null,
  }
}

/**
 * Compare two version strings.
 * Returns >0 if a > b, <0 if a < b, 0 if equal.
 * A version without prerelease is greater than one with prerelease
 * (e.g. 1.0.0 > 1.0.0-rc.1).
 */
export function compareVersions(a: string, b: string): number {
  const av = parseVersion(a)
  const bv = parseVersion(b)
  if (!av || !bv) return 0

  if (av.major !== bv.major) return av.major - bv.major
  if (av.minor !== bv.minor) return av.minor - bv.minor
  if (av.patch !== bv.patch) return av.patch - bv.patch

  // No prerelease wins over prerelease
  if (!av.prerelease && bv.prerelease) return 1
  if (av.prerelease && !bv.prerelease) return -1
  if (!av.prerelease && !bv.prerelease) return 0

  const aParts = av.prerelease!.split(/[.-]/)
  const bParts = bv.prerelease!.split(/[.-]/)
  const len = Math.max(aParts.length, bParts.length)

  for (let i = 0; i < len; i++) {
    const ap = aParts[i]
    const bp = bParts[i]
    if (ap === undefined) return -1
    if (bp === undefined) return 1

    const aNum = /^\d+$/.test(ap)
    const bNum = /^\d+$/.test(bp)

    if (aNum && bNum) {
      const diff = Number(ap) - Number(bp)
      if (diff !== 0) return diff
      continue
    }
    if (aNum) return -1
    if (bNum) return 1
    if (ap !== bp) return ap < bp ? -1 : 1
  }

  return 0
}

export function isNewer(latest: string, current: string): boolean {
  return compareVersions(latest, current) > 0
}
