"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

const PLUGIN_NAME = "dsh-update-client";
const POLL_INTERVAL_MS = 5 * 60 * 1000;
const CHECK_URL = "/api/dsh-update/check";

async function fetchUpdateCheck() {
  try {
    const resp = await fetch(CHECK_URL, {
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

function createBanner(result) {
  const React = globalThis.React;
  if (!React) return null;
  return React.createElement(UpdateBanner, {
    result,
    onDismiss: () => { /* handled by apply */ },
    onViewRelease: () => {
      if (result.release?.url) {
        window.open(result.release.url, "_blank", "noopener,noreferrer");
      }
    },
  });
}

function UpdateBanner(props) {
  const React = globalThis.React;
  const { result, onDismiss, onViewRelease } = props;
  return React.createElement(
    "div",
    {
      style: {
        position: "fixed",
        top: "12px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 16px",
        borderRadius: "10px",
        background: "var(--dsw-alias-bg-elevated, #2a2a2e)",
        border: "1px solid var(--dsw-alias-border-subtle, #3a3a3e)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        fontSize: "13px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "var(--dsw-alias-text-primary, #e8e8ec)",
        maxWidth: "480px",
      },
    },
    React.createElement("span", { style: { fontSize: "16px", flexShrink: 0 } }, "🚀"),
    React.createElement(
      "div",
      { style: { flex: 1, minWidth: 0 } },
      React.createElement("div", { style: { fontWeight: 600, marginBottom: "2px" } },
        `DSH ${result.latestVersion} available`),
      React.createElement("div", { style: { fontSize: "12px", opacity: 0.7 } },
        `You're on ${result.currentVersion}`)
    ),
    React.createElement("button", {
      onClick: onDismiss,
      style: {
        padding: "4px 10px",
        borderRadius: "6px",
        border: "1px solid var(--dsw-alias-border-subtle, #3a3a3e)",
        background: "transparent",
        color: "inherit",
        cursor: "pointer",
        fontSize: "12px",
        flexShrink: 0,
      },
    }, "Later"),
    React.createElement("button", {
      onClick: onViewRelease,
      style: {
        padding: "4px 10px",
        borderRadius: "6px",
        border: "none",
        background: "var(--dsw-alias-action-primary, #6366f1)",
        color: "#fff",
        cursor: "pointer",
        fontSize: "12px",
        fontWeight: 600,
        flexShrink: 0,
      },
    }, "Update")
  );
}

// ── Direct exports (DSH requires direct properties, not getters) ───────────

exports.name = PLUGIN_NAME;

exports.apply = function (ctx) {
  let dismissed = false;
  let timer;
  let unregister;

  async function poll() {
    if (dismissed) return;
    if (unregister) return;
    const result = await fetchUpdateCheck();
    if (!result?.hasUpdate || !result.release) return;
    if (ctx.slots) {
      unregister = ctx.slots.register(
        { name: "root", priority: -1 },
        () => createBanner(result)
      );
    }
  }

  ctx.inject(["slots"], (slotCtx) => {
    poll();
    timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (timer) { clearInterval(timer); timer = undefined; }
      if (unregister) { unregister(); unregister = undefined; }
    };
  });
};
