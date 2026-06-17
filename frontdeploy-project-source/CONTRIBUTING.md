# Contributing

Thanks for helping improve Axiom Intelligence.

## Local Setup

```bash
npm install
npm run verify
```

`npm run verify` runs TypeScript checking, the production Plasmo build, and a
runtime dependency audit.

## Development Rules

- Keep the extension read-only.
- Do not add wallet connection or transaction signing.
- Do not add auto trading or copy trading.
- Do not request seed phrases, private keys, or wallet credentials.
- Prefer mock data first, then optional read-only providers.
- Keep code small, typed, and reusable.
- Store local labels/settings with `chrome.storage.local`.

## Pull Requests

Before opening a pull request:

- run `npm run verify`
- keep commits focused
- explain user-visible behavior changes
- document any new permissions or host permissions
- include screenshots for UI changes when practical

## Security Review

Any change that touches permissions, provider keys, storage, content scripts, or
network calls should include a short security note in the pull request.
