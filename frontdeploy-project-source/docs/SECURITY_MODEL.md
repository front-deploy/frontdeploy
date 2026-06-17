# Security Model

## Trust Boundaries

Frontdeploy runs entirely inside the browser extension context. It reads
public page text from Axiom pages, stores local user labels/settings, and may
request optional public intelligence data from read-only providers.

## Local Data

Stored with `chrome.storage.local`:

- manual wallet labels
- overlay settings
- selected address
- optional backend API URL

The extension must not store private keys, seed phrases, signed transactions,
browser cookies, or exchange credentials.

Optional backend storage with PostgreSQL/Supabase:

- wallet labels
- wallet profile snapshots
- token risk cache

Cloud label sync is disabled by default and must remain behind real user auth
before production use. Provider keys and database credentials belong only on the
backend, never in extension code or `chrome.storage.local`.

## Permissions

Current permissions:

- `storage` for local labels/settings
- `sidePanel` for the Chrome side panel

Current host permissions:

- `https://axiom.trade/*`
- `https://api.jup.ag/*`
- `https://mainnet.helius-rpc.com/*`
- `https://public-api.birdeye.so/*`

Any new permission must be documented in the pull request and README.

## Network Policy

Extension network calls are limited to Axiom pages and the configured read-only
backend API. GMGN, Solana Tracker, GoPlus, Helius, Birdeye, Jupiter, database,
and future AI provider keys must stay on the backend. The extension should
continue to work with mock data when the backend is absent.

GMGN integration is query-only through `gmgn-cli token info`. Do not configure
`GMGN_PRIVATE_KEY`, swap commands, order commands, copy trading, or wallet
management commands for this project.

Developer reputation audit fetches public website and GitHub README content
only. X/social proof is treated as manual evidence until an authenticated social
API is configured.

## User Safety

The UI must never ask users for seed phrases, private keys, wallet passwords, or
transaction signatures. Risk scores and summaries are informational only and are
not financial advice.
