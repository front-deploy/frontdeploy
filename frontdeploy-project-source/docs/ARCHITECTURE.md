# Architecture

Frontdeploy is a Chrome Manifest V3 extension built with Plasmo, React,
TypeScript, and Tailwind CSS.

## Runtime Surfaces

- `apps/extension/src/contents/axiom.tsx` runs on `https://axiom.trade/*` and injects
  read-only intelligence badges beside detected Solana-style addresses.
- `apps/extension/src/popup.tsx` renders the popup status and settings UI.
- `apps/extension/src/sidepanel.tsx` renders the selected wallet/token inspector.
- `apps/extension/src/lib/storage.ts` wraps `chrome.storage.local` for labels, settings, and
  selected address state.
- `apps/api/src/server.ts` runs the read-only backend API for future provider,
  cache, and cloud label workflows.
- `apps/api/src/providers/` contains backend-only GMGN, Solana Tracker, GoPlus,
  Helius, Birdeye, Jupiter, and DexScreener adapters. API keys stay on the
  backend.
- `apps/api/src/services/intelligenceService.ts` merges mock intelligence with
  optional provider enrichment and database caching.
- `apps/api/src/routes/reputation.ts` audits project proof such as website CA,
  GitHub README CA, repository metadata, market cap, and manual social narrative evidence.
- `apps/api/src/routes/summary.ts` exposes a safe mock AI summary endpoint
  without paid AI APIs or wallet-sensitive inputs.

## Data Flow

1. The content script scans visible text nodes for Solana-style Base58
   addresses.
2. Detected addresses are classified as wallet or token candidates with local
   heuristics.
3. Mock intelligence is generated deterministically so the UI remains useful
   without paid APIs.
4. Optional read-only backend provider calls enrich intelligence when backend
   API keys are configured.
5. Clicking a badge saves the selected address in `chrome.storage.local`.
6. The side panel reads the selected address and displays local labels,
   risk score, summary, and recent mock activity.

## Provider Boundaries

Provider modules are isolated behind typed functions so future integrations can
replace mock data without changing UI components. Current provider usage must
remain read-only and low-privilege.

## Non-Goals

- exchange functionality
- trading execution
- copy trading
- wallet connection
- private key or seed phrase handling
- backend account system
