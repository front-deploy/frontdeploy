# Frontdeploy

> **AI-powered X-to-pump.fun launch radar for Solana trenchers.**
>
> Scan narratives, generate launch drafts, deploy faster — all inside your browser.

---

## Overview

Frontdeploy is a Chrome Extension (Manifest V3) that turns your X/Twitter scrolling session into a real-time token launch intelligence feed. While you browse, the extension:

1. **Detects** trending replies and narratives from watched accounts.
2. **Generates** a pump.fun launch draft — token name, ticker, description, source link, and AI logo prompt.
3. **Hands off** metadata to `pump.fun/create` so you can manually verify, upload a logo, and deploy.

It also provides wallet/token intelligence badges on [Axiom Trade](https://axiom.trade) with risk scores, developer audits, and optional live data enrichment.

**Privacy-first. Read-only. No wallet connections, no private keys, no auto-trading.**

---

## Repository Structure

```
frontdeploy/
├── frontdeploy-project-source/   # Chrome Extension + Backend API (monorepo)
│   ├── apps/
│   │   ├── extension/             # Plasmo + React Chrome Extension
│   │   └── api/                   # Optional read-only backend API
│   ├── docs/                      # Architecture & security model docs
│   ├── .github/                   # CI workflows, PR/issue templates
│   ├── CONTRIBUTING.md
│   ├── SECURITY.md
│   ├── LICENSE                    # MIT
│   └── README.md                  # Extension-specific README
│
├── frontdeploy-web/              # Next.js marketing/landing page
│   ├── src/
│   │   ├── app/                   # Next.js App Router (layout, page, globals.css)
│   │   ├── components/            # React components (layout, sections, ui)
│   │   └── hooks/                 # Custom React hooks
│   └── package.json
│
├── index.html                     # Static standalone landing page
├── DEVELOPER_GUIDE.md             # Internal developer handoff guide (gitignored)
└── README.md                      # ← You are here
```

---

## Core Features

| # | Feature | Description |
|---|---------|-------------|
| 01 | **X Launch Radar** | Scans X/Twitter replies in real-time while you scroll. Detects trending narratives from major accounts and surfaces launch opportunities. |
| 02 | **Pump.fun Draft Engine** | Auto-generates launch metadata — token name, ticker, description, source link, and AI logo prompt. Copy or open `pump.fun/create` in one click. |
| 03 | **AI Logo Handoff** | Generates optimized prompts for token logo creation and opens ChatGPT directly for AI image generation. |
| 04 | **Wallet Intelligence** | Detects Solana addresses on Axiom Trade and injects intelligence badges with risk scores, wallet labels, and token security signals. |
| 05 | **Developer Audit** | Reputation scoring with website CA proof, GitHub README proof, repo metadata, market cap thresholds, and social narrative checks. |
| 06 | **Privacy-First** | Read-only architecture. No wallet connections, no private keys, no SOL custody. Data stays in `chrome.storage.local`. |

---

## Tech Stack

### Chrome Extension (`frontdeploy-project-source`)

| Layer | Technology |
|-------|-----------|
| Framework | [Plasmo](https://www.plasmo.com/) |
| UI | React + TypeScript |
| Styling | Tailwind CSS |
| Manifest | Chrome Extension Manifest V3 |
| Storage | `chrome.storage.local` |
| Data Providers | Jupiter Price API · Helius DAS API · Birdeye Token Security (optional) |

### Marketing Website (`frontdeploy-web`)

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js](https://nextjs.org/) 16 (App Router) |
| UI | React 19 + TypeScript |
| Fonts | Instrument Serif · DM Sans (Google Fonts) |
| Styling | Vanilla CSS with custom design tokens |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Google Chrome** (for extension testing)

### Extension Development

```bash
# Navigate to the extension source
cd frontdeploy-project-source

# Install dependencies (npm workspaces)
npm install

# Start Plasmo dev server (hot reload)
npm run dev

# Production build
npm run build

# Verify (typecheck + build + audit)
npm run verify
```

### Backend API (Optional)

The extension works standalone with local mock intelligence. The backend adds live data enrichment.

```bash
cd frontdeploy-project-source

# Copy environment template
cp apps/api/.env.example apps/api/.env

# Start backend dev server
npm run api:dev

# Build backend
npm run api:build

# Verify extension + backend together
npm run verify:all
```

**Environment variables** (stored in `apps/api/.env`, never committed):

```env
DATABASE_URL=
HELIUS_API_KEY=
BIRDEYE_API_KEY=
JUPITER_API_KEY=
GMGN_API_KEY=
SOLANA_TRACKER_API_KEY=
GOPLUS_API_KEY=
CLOUD_LABEL_SYNC_ENABLED=false
```

### Marketing Website

```bash
cd frontdeploy-web

# Install dependencies
npm install

# Start Next.js dev server
npm run dev

# Production build
npm run build

# Start production server
npm run start
```

---

## Loading the Extension in Chrome

1. Run `npm run build` inside `frontdeploy-project-source`.
2. Open Chrome → `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked**.
5. Select the folder: `frontdeploy-project-source/apps/extension/build/chrome-mv3-prod`.
6. Navigate to [x.com](https://x.com) — the Launch Radar floating assistant will appear.
7. Navigate to [axiom.trade](https://axiom.trade) — intelligence badges will appear on detected addresses.

> **Tip:** If Launch Radar doesn't appear on X, check the extension details and allow site access for `https://x.com/*` and `https://twitter.com/*`.

---

## User Flow

```
  ┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
  │  Scroll X    │ ──▶ │  Launch Card     │ ──▶ │  Generate Logo   │ ──▶ │  Deploy on       │
  │  /Twitter    │     │  name · ticker   │     │  via ChatGPT     │     │  pump.fun        │
  │              │     │  desc · source   │     │  AI prompt       │     │  (manual)        │
  └──────────────┘     └─────────────────┘     └──────────────────┘     └──────────────────┘
```

---

## CI / Automation

The repository includes a GitHub Actions workflow at `.github/workflows/build.yml` that runs:

- `npm ci`
- `npm run verify` (TypeScript check + production build + runtime dependency audit)

Triggered on pushes, pull requests, and manual dispatch.

---

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/ARCHITECTURE.md`](frontdeploy-project-source/docs/ARCHITECTURE.md) | Extension surfaces, data flow, provider boundaries, non-goals |
| [`docs/SECURITY_MODEL.md`](frontdeploy-project-source/docs/SECURITY_MODEL.md) | Trust boundaries, local data, permissions, network policy, user safety |
| [`apps/api/README.md`](frontdeploy-project-source/apps/api/README.md) | Backend commands, endpoints, environment, safety boundaries |
| [`CONTRIBUTING.md`](frontdeploy-project-source/CONTRIBUTING.md) | Local setup, PR expectations, security review rules |
| [`SECURITY.md`](frontdeploy-project-source/SECURITY.md) | Supported versions, vulnerability reporting, secret handling |

---

## Roadmap

- [ ] Helius API integration
- [ ] Birdeye token risk data
- [ ] Wallet PnL calculation
- [ ] Cloud label sync
- [ ] AI wallet summary
- [ ] Smart wallet database
- [ ] Token-gated premium features
- [ ] Influencer watchlists and configurable X reply alerts
- [ ] AI image generation handoff for launch logo drafts
- [ ] Manual pump.fun launch checklist with richer preflight checks

---

## Security

> ⚠️ **Frontdeploy is a read-only launch radar and intelligence overlay.**

The extension **does NOT** and **must NEVER**:

- Connect wallets
- Request seed phrases or private keys
- Execute trades or auto-deploy tokens
- Perform copy trading or auto trading
- Submit signed transactions
- Custody SOL or any token

X Launch Radar creates metadata drafts and opens the official `pump.fun/create` page — the user must verify and deploy manually.

**Do not enter seed phrases, private keys, or API secrets into this extension.**

For vulnerability reporting, see [`SECURITY.md`](frontdeploy-project-source/SECURITY.md).

---

## Contributing

See [`CONTRIBUTING.md`](frontdeploy-project-source/CONTRIBUTING.md) for local setup, development rules, and pull request guidelines.

Before submitting any changes:

```bash
cd frontdeploy-project-source
npm run verify:all
```

---

## License

[MIT](frontdeploy-project-source/LICENSE) © 2026 Mightcook
