# Frontdeploy

Frontdeploy is an AI-powered X-to-pump.fun launch radar for Solana trenchers. Its primary workflow is reading live X/Twitter replies, turning notable reply narratives into a pump.fun launch draft, and helping users move from trend discovery to a manual token launch faster.

The extension also adds wallet labels, token risk signals, developer proof checks, and onchain-style insights directly inside Axiom. It is privacy-first and read-only: it does not connect wallets, hold SOL, request private keys, or execute token deployments.

## Core Product

The main feature is **X Launch Radar**:

- While the user scrolls X/Twitter, the extension detects reply cards from major or watched accounts.
- It reads the visible reply context and source X link.
- It creates a launch draft with suggested token name, ticker, description, source link, and logo prompt.
- It shows a floating on-screen assistant so the user can copy name, ticker, X link, full metadata, or logo prompt.
- It can open ChatGPT for AI logo generation using the prepared prompt.
- It can open `https://pump.fun/create` so the user can manually deploy on the official pump.fun page.

This is a manual launch assistant, not an automated deployer. The user must still verify the narrative, provide any image, connect their own wallet on pump.fun, and submit the launch manually.

## Repository Health

- MIT licensed.
- Security policy and private vulnerability reporting path are documented in `SECURITY.md`.
- Architecture and security model are documented in `docs/`.
- Dependabot is configured for npm and GitHub Actions.
- Pull request and issue templates include security boundaries.
- `npm run verify` runs type checking, production build, and runtime dependency audit.

## MVP Features

- Scan X/Twitter replies and show a floating launch assistant while users scroll.
- Generate safe pump.fun launch drafts from X reply context.
- Suggest token name, ticker, description, source X link, and logo prompt.
- Copy launch fields one by one or copy all metadata for fast paste into pump.fun.
- Open ChatGPT for logo generation prompt handoff.
- Open `pump.fun/create` for manual deployment on the official site.
- Detect Solana-style wallet and token addresses on `https://axiom.trade/*`.
- Inject small intelligence badges beside detected addresses.
- Show hover tooltips with mock wallet or token summaries.
- Add manual wallet labels saved in `chrome.storage.local`.
- Show a side panel for the selected wallet or token.
- Display risk scores with mock fallback and optional live provider data.
- Audit developer/project reputation with website CA proof, GitHub README proof, repo metadata, market cap threshold, and manual social narrative evidence.
- Provide a clean popup with overlay status and settings.
- Connect to the optional read-only backend API for Jupiter, Helius, and Birdeye enrichment.

## Tech Stack

- Plasmo
- React
- TypeScript
- Tailwind CSS
- Chrome Extension Manifest V3
- `chrome.storage.local`
- Optional live data providers:
  - Jupiter Price API
  - Helius DAS API
  - Birdeye token security API

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Backend API:

```bash
npm install
npm run api:dev
```

## Build

```bash
npm run build
```

## Verify

```bash
npm run verify
```

This runs TypeScript checking and the production Plasmo build.

To verify the extension and backend together:

```bash
npm run verify:all
```

## Runtime Dependency Audit

```bash
npm run audit:runtime
```

This checks production/runtime dependencies with `npm audit --omit=dev --audit-level=moderate`.

## Live Data Setup

The extension works without a backend by falling back to local mock intelligence.
To enable live/hybrid intelligence, run the backend API and configure backend
environment variables:

- Jupiter API key for token price and liquidity
- Helius API key for token metadata and wallet holdings
- Birdeye API key for token security signals

Provider keys are stored only in backend environment variables, never in the
extension. The popup stores only the backend URL in `chrome.storage.local`.
Do not store private keys, seed phrases, wallet credentials, or high-privilege
backend secrets in the extension.

## Load In Chrome

1. Run `npm run build`.
2. Open Chrome and go to `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select `apps/extension/build/chrome-mv3-prod`.
6. Open `https://axiom.trade/*` and inspect detected address badges.
7. Open `https://x.com/*` or `https://twitter.com/*` to inspect X reply launch radar cards.

## Automation

The repository includes a GitHub Actions workflow at `.github/workflows/build.yml`.
It runs `npm ci` and `npm run verify` on pushes, pull requests, and manual dispatch.

If GitHub returns `Actions has been disabled for this user`, the repository workflow
is valid but the account needs GitHub Actions enabled at the account/billing/support level.

## Documentation

- `docs/ARCHITECTURE.md` explains extension surfaces, data flow, provider boundaries, and non-goals.
- `docs/SECURITY_MODEL.md` explains trust boundaries, local data, permissions, network policy, and user safety.
- `apps/api/README.md` explains backend commands, endpoints, environment, and safety boundaries.
- `CONTRIBUTING.md` explains local setup, pull request expectations, and security review rules.
- `SECURITY.md` explains supported versions, reporting, scope, and secret handling.

## Roadmap

- Helius API integration
- Birdeye token risk data
- Wallet PnL calculation
- Cloud label sync
- AI wallet summary
- Smart wallet database
- Token-gated premium features
- Influencer watchlists and configurable X reply alerts
- AI image generation handoff for launch logo drafts
- Manual pump.fun launch checklist with richer preflight checks

## Security Disclaimer

Frontdeploy is a read-only launch radar and intelligence overlay. It does not build auto trading, copy trading, automatic token deployment, wallet connection, private key handling, seed phrase handling, SOL custody, or trading execution. X launch radar creates metadata drafts and opens the official pump.fun create page only; the user must verify and deploy manually. Do not enter seed phrases, private keys, or API secrets into this extension.
