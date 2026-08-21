/**
 * dsh-update client plugin.
 *
 * Polls the host's /api/dsh-update/check endpoint and renders an update
 * notification banner into the root slot (at a lower priority so it overlays
 * the shell) when a new DSH version is available.
 */

import type { Context } from '@deepseek-ai/cordis'
import type { UpdateCheckResult } from './types.js'

declare module '@deepseek-ai/cordis' {
  interface Context {
    slots: {
      register(options: { name: string; priority?: number }, component: () => any): () => void
    }
  }
}

const PLUGIN_NAME = 'dsh-update-client'

/** How often (ms) to re-check for updates from the host. */
const POLL_INTERVAL_MS = 5 * 60 * 1000

/** API endpoint registered by the host plugin. */
const CHECK_URL = '/api/dsh-update/check'

// ── HTTP helper ────────────────────────────────────────────────────────────

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

// ── Cordis plugin ──────────────────────────────────────────────────────────

export const name = PLUGIN_NAME

export function apply(ctx: Context) {
  let dismissed = false
  let timer: ReturnType<typeof setInterval> | undefined
  let unregister: (() => void) | undefined

  /** Poll the host and show the banner when an update is available. */
  async function poll(): Promise<void> {
    if (dismissed) return
    if (unregister) return // already showing

    const result = await fetchUpdateCheck()
    if (!result?.hasUpdate || !result.release) return

    // Register into the root slot at priority -1 so it overlays the shell.
    if (ctx.slots) {
      unregister = ctx.slots.register(
        { name: 'root', priority: -1 },
        () => createBanner(result),
      )
    }
  }

  /** Build the React banner element. */
  function createBanner(result: UpdateCheckResult): any {
    const React = (globalThis as any).React
    if (!React) return null

    return React.createElement(UpdateBanner, {
      result,
      onDismiss: () => {
        dismissed = true
        if (unregister) {
          unregister()
          unregister = undefined
        }
      },
      onViewRelease: () => {
        if (result.release?.url) {
          window.open(result.release.url, '_blank', 'noopener,noreferrer')
        }
      },
    })
  }

  // Start polling once slots are ready (lazy injection).
  ctx.inject(['slots'], (slotCtx) => {
    poll()
    timer = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      if (timer) {
        clearInterval(timer)
        timer = undefined
      }
      if (unregister) {
        unregister()
        unregister = undefined
      }
    }
  })
}

// ── Banner component ───────────────────────────────────────────────────────

interface BannerProps {
  result: UpdateCheckResult
  onDismiss: () => void
  onViewRelease: () => void
}

function UpdateBanner(props: BannerProps): any {
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

    // Icon
    React.createElement(
      'span',
      { style: { fontSize: '16px', flexShrink: 0 } },
      '\u{1F680}',
    ),

    // Text content
    React.createElement(
      'div',
      { style: { flex: 1, minWidth: 0 } },
      React.createElement(
        'div',
        { style: { fontWeight: 600, marginBottom: '2px' } },
        `DSH ${result.latestVersion} available`,
      ),
      React.createElement(
        'div',
        { style: { fontSize: '12px', opacity: 0.7 } },
        `You're on ${result.currentVersion}`,
      ),
    ),

    // Actions
    React.createElement(
      'button',
      {
        onClick: onDismiss,
        style: {
          padding: '4px 10px',
          borderRadius: '6px',
          border: '1px solid var(--dsw-alias-border-subtle, #3a3a3e)',
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          fontSize: '12px',
          flexShrink: 0,
        },
      },
      'Later',
    ),

    React.createElement(
      'button',
      {
        onClick: onViewRelease,
        style: {
          padding: '4px 10px',
          borderRadius: '6px',
          border: 'none',
          background: 'var(--dsw-alias-action-primary, #6366f1)',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 600,
          flexShrink: 0,
        },
      },
      'Update',
    ),
  )
}
