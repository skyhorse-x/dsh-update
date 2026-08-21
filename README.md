# dsh-update

DeepSeek Harness update checker plugin. Automatically detects new releases
from https://github.com/deepseek-ai/deepseek-harness/tags and prompts the
user to upgrade.

## How it works

The plugin has two halves:

- **Host** (`src/host.ts`) — registers an HTTP endpoint
  `/api/dsh-update/check` on the web server. It fetches the latest tag from
  GitHub, compares it to the running DSH version, and returns a JSON result.
- **Client** (`src/client.ts`) — polls the endpoint every 5 minutes. When a
  newer version is detected, a floating banner appears at the top of the
  screen with **Update** and **Later** actions.

## Install

```sh
cd F:\dsh-plugs\dsh-update
npm install
npm run build
```

Then add it to a profile:

```sh
dsh plugin --profile web add F:\dsh-plugs\dsh-update
```

Restart the web profile:

```sh
dsh web
```

## What "clicking Update" does (v1)

v1 only **detects and notifies**. Clicking **Update** opens the GitHub
release page in a new tab. The actual upgrade is left to the user, because
the correct upgrade path depends on how DSH was installed (`npm`, `pnpm`,
`git clone`, bundled release binary).

## Files

| File | Purpose |
|---|---|
| `src/host.ts` | Host-side service + HTTP endpoint |
| `src/client.ts` | Browser-side notification banner |
| `src/semver.ts` | Semver parsing and comparison |
| `src/types.ts` | Shared TypeScript types |
| `cordis.patch.yml` | Cordis plugin registration |

## API

### `GET /api/dsh-update/check`

Response:

```json
{
  "currentVersion": "0.1.0-rc.5",
  "latestVersion": "0.1.1-rc.1",
  "hasUpdate": true,
  "release": {
    "version": "0.1.1-rc.1",
    "tag": "dsh-v0.1.1-rc.1",
    "name": "dsh-v0.1.1-rc.1",
    "url": "https://github.com/.../tag/dsh-v0.1.1-rc.1",
    "body": "",
    "publishedAt": null,
    "prerelease": true,
    "isBranch": true
  },
  "error": null,
  "checkedAt": 1737200000000
}
```

The host caches the result for 5 minutes.
