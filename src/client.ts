/**
 * dsh-update client plugin.
 *
 * Polls the host's /api/dsh-update/check endpoint and renders an update
 * notification banner into the root slot when a new DSH version is available.
 */

const PLUGIN_NAME = 'dsh-update-client'
const POLL_INTERVAL_MS = 5 * 60 * 1000
const CHECK_URL = '/api/dsh-update/check'

interface UpdateCheckResult {
  currentVersion: string
  latestVersion: string | null
  hasUpdate: boolean
  release: {
    version: string
    tag: string
    name: string
    url: string
    body: string
    publishedAt: string | null
    prerelease: boolean
    isBranch: boolean
  } | null
  error: string | null
  checkedAt: number
}

async function fetchUpdateCheck(): Promise<UpdateCheckResult | null> {
  try {
    const resp = await fetch(CHECK_URL, {
      headers: { Accept: 'application/json' },
    })
    if (!resp.ok) return null
    return (await resp.json()) as UpdateCheckResult
  } catch {
    return null
  }
}

function createBanner(result: UpdateCheckResult): any {
  const React = (globalThis as any).React
  if (!React) return null
  return React.createElement(UpdateBanner, {
    result,
    onDismiss: () => {},
    onViewRelease: () => {
      if (result.release?.url) {
        window.open(result.release.url, '_blank', 'noopener,noreferrer')
      }
    },
  })
}

function UpdateBanner(props: { result: UpdateCheckResult; onDismiss: () => void; onViewRelease: () => void }): any {
  const React = (globalThis as any).React
  const { result, onDismiss, onViewRelease } = props
  return React.createElement(
    'div',
    {
      style: {
        position: 'fixed',
        top: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 16px',
        borderRadius: '10px',
        background: 'var(--dsw-alias-bg-elevated, #2a2a2e)',
        border: '1px solid var(--dsw-alias-border-subtle, #3a3a3e)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        fontSize: '13px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: 'var(--dsw-alias-text-primary, #e8e8ec)',
        maxWidth: '480px',
      },
    },
    React.createElement('span', { style: { fontSize: '16px', flexShrink: 0 } }, '🚀'),
    React.createElement(
      'div',
      { style: { flex: 1, minWidth: 0 } },
      React.createElement('div', { style: { fontWeight: 600, marginBottom: '2px' } },
        `DSH ${result.latestVersion} available`),
      React.createElement('div', { style: { fontSize: '12px', opacity: 0.7 } },
        `You're on ${result.currentVersion}`),
    ),
    React.createElement('button', {
      onClick: onDismiss,
      style: {
        padding: '4px 10px', borderRadius: '6px',
        border: '1px solid var(--dsw-alias-border-subtle, #3a3a3e)',
        background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: '12px', flexShrink: 0,
      },
    }, 'Later'),
    React.createElement('button', {
      onClick: onViewRelease,
      style: {
        padding: '4px 10px', borderRadius: '6px',
        border: 'none', background: 'var(--dsw-alias-action-primary, #6366f1)',
        color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 600, flexShrink: 0,
      },
    }, 'Update'),
  )
}

// ── Exports ────────────────────────────────────────────────────────────────

export const name = PLUGIN_NAME

export function apply(ctx: any) {
  let dismissed = false
  let timer: ReturnType<typeof setInterval> | undefined
  let unregister: (() => void) | undefined

  async function poll(): Promise<void> {
    if (dismissed) return
    if (unregister) return
    const result = await fetchUpdateCheck()
    if (!result?.hasUpdate || !result.release) return
    if (ctx.slots) {
      unregister = ctx.slots.register(
        { name: 'root', priority: -1 },
        () => createBanner(result),
      )
    }
  }

  ctx.inject(['slots'], (slotCtx: any) => {
    poll()
    timer = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      if (timer) { clearInterval(timer); timer = undefined }
      if (unregister) { unregister(); unregister = undefined }
    }
  })
}
