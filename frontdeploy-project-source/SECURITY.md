# Security Policy

## Supported Versions

Axiom Intelligence is in MVP development. Security fixes target the current
`main` branch until a stable release channel exists.

## Security Scope

Axiom Intelligence is a read-only Chrome extension overlay for Axiom pages. It
must not:

- connect wallets
- request seed phrases or private keys
- execute trades
- copy trade
- submit signed transactions
- transmit local wallet labels without explicit future user consent

Optional provider keys are stored in `chrome.storage.local` for local extension
use only. Treat those keys as low-privilege, read-only keys and rotate them if
they are exposed.

## Reporting a Vulnerability

Open a private security advisory on GitHub or contact the repository owner with:

- affected file or feature
- reproduction steps
- expected impact
- suggested fix, if known

Please do not publish exploit details until a fix is available.

## Secret Handling

Do not commit `.env` files, API keys, private keys, seed phrases, session
tokens, browser cookies, or wallet credentials. If a secret is committed,
revoke it immediately and rotate any affected credentials.
