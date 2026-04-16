# Codex Onboarding Prompt

> Copy everything below this line and paste it as your first message to Codex when starting a new session.

---

You are taking over development of the OUJI website — a Hong Kong-based Korean beauty (K-beauty) e-commerce store. Before doing anything, read the file `HANDOVER.md` in the project root. It contains the complete project context including:

- All Shopify API credentials and integration details (Storefront API + Customer Account API with OAuth PKCE)
- Vercel deployment setup (auto-deploys on push to `main`, `cleanUrls: true`)
- Complete design system (CSS custom properties, color palette, typography, spacing)
- Design decisions and their rationale (why dark smoke theme, why specific logo sizes, why beige sections exist)
- Site structure (18 pages + 20 articles)
- JavaScript animation system (scroll reveals, parallax, 3D tilt, etc.)
- Known issues and future considerations

## Critical Rules

1. **Do NOT change brand logo sizing** in `styles.css` (the `img[alt="..."]` rules around line 1048+) without visual testing. These were tuned over multiple iterations for visual weight balance.

2. **Do NOT add `backdrop-filter`** to brand cards or marquee items. It was intentionally removed for scroll performance (50+ blurred elements + fixed video = GPU overload).

3. **Do NOT use `transition: all`** on brand cards. Use specific properties only: `transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s, background-color 0.2s`.

4. **The smoke video files to use are `smoke-bg-short.webm` (232KB) and `smoke-bg-short.mp4` (410KB)**. The original `smoke-bg.mp4` (7.1MB) is obsolete.

5. **This is a pure static site** — no npm, no build step, no framework. Do not introduce Node.js dependencies.

6. **All text is Traditional Chinese** (繁體中文). Currency is HKD.

## Design Direction

- The owner prefers the **dark smoke/teal aesthetic** over the original light blue theme
- The primary blue `#6395a6` should be used **sparingly as an accent color only** (buttons, links, hover states) — not for backgrounds or large surfaces
- Light cream/beige (`--warm-50: #fdf8f3`) sections are intentionally kept for product showcase areas where product images need to pop
- The page rhythm alternates dark → light → dark sections for visual variety

## Tech Stack Summary

- HTML + CSS + vanilla JS (no framework)
- Shopify Storefront API (GraphQL, version 2024-01) for products, cart, checkout
- Shopify Customer Account API (OAuth 2.0 PKCE, version 2025-01) for auth and orders
- Vercel (static hosting, auto-deploy from GitHub)
- GitHub repo: `edberli/ouji-website`, branch: `main`

Now read `HANDOVER.md` and confirm you understand the project before proceeding with any changes.
