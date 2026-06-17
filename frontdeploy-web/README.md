# Frontdeploy — Web

Official landing page for **Frontdeploy**, the AI-powered Solana launch intelligence Chrome extension.

## Tech Stack

| Layer     | Technology                       |
| --------- | -------------------------------- |
| Framework | Next.js 16 (App Router)          |
| Library   | React 19                         |
| Language  | TypeScript                       |
| Styling   | Vanilla CSS (custom properties)  |
| Fonts     | Instrument Serif, DM Sans        |

## Project Structure

```
src/
├── app/
│   ├── globals.css          # All styles (migrated from original HTML)
│   ├── layout.tsx           # Root layout, Google Fonts config
│   └── page.tsx             # Landing page (composes sections)
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx       # Fixed navigation bar
│   │   └── Footer.tsx       # Page footer with links
│   ├── sections/
│   │   ├── Hero.tsx         # Hero with CTA buttons
│   │   ├── Features.tsx     # 6-card feature grid
│   │   ├── HowItWorks.tsx   # 4-step workflow
│   │   ├── Ticker.tsx       # Infinite scroll marquee
│   │   ├── Install.tsx      # Installation guide
│   │   └── Cta.tsx          # Final call-to-action
│   └── ui/
│       └── Divider.tsx      # Reusable section divider
└── hooks/
    └── useIntersectionObserver.ts   # Scroll-triggered fade-in animations
```

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

## Production Build

```bash
npm run build
npm run start
```

## Download

The Chrome extension ZIP is served from `public/downloads/`. Clicking any **Download** button on the page will trigger a direct download of `sora-pump-os-chrome-mv3-prod.zip`.

## License

MIT
