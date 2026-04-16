# OUJI Website — AI Handover Document

> This document contains everything an AI coding assistant needs to seamlessly continue development on the OUJI Korean beauty e-commerce website.

---

## 1. Project Overview

**OUJI** is a Hong Kong-based Korean beauty (K-beauty) e-commerce store selling skincare, makeup, body care, fragrance, and lifestyle products. The website is a **pure static site** (vanilla HTML + CSS + JS, no framework, no build step) with a **headless Shopify** backend.

- **Language**: Traditional Chinese (繁體中文), with some English
- **Currency**: HKD (Hong Kong Dollars), formatted as `HK$X,XXX`
- **Target audience**: Hong Kong consumers interested in K-beauty

---

## 2. Repository & Deployment

| Item | Detail |
|------|--------|
| **GitHub repo** | `https://github.com/edberli/ouji-website.git` (branch: `main`) |
| **Vercel** | Auto-deploys on push to `main`. Project ID: `prj_je9TsuPxFe2xJjbUzm0NSzuIhHIA`. Config: `vercel.json` with `cleanUrls: true` (strips `.html` extensions) |
| **GitHub Pages** | Also deploys via GitHub Actions (`.github/workflows/deploy.yml`) on push to `main` |
| **Local dev** | `python3 -m http.server 8085` from project root (no Node.js needed) |
| **No package.json** | No npm, no build tools, no bundler. Everything is vanilla. |

---

## 3. Shopify Integration

All Shopify integration lives in **`shopify.js`**. Credentials are client-side (standard for headless Storefront API + PKCE).

### Storefront API
- **Store domain**: `5rerjn-mt.myshopify.com`
- **Storefront Access Token**: `795e2f7cb13da1d3776449eba5802377`
- **API version**: `2024-01`
- **Endpoint**: `https://5rerjn-mt.myshopify.com/api/2024-01/graphql.json`

### Customer Account API (OAuth 2.0 PKCE)
- **Client ID**: `1f1d6e0a-746a-4c4e-9ca5-7006981c9ade`
- **Shop ID**: `76534055070`
- **API version**: `2025-01`
- **Redirect URI**: `{origin}/account.html`
- **Endpoint**: `https://shopify.com/76534055070/account/customer/api/2025-01/graphql`

### Key Functions in shopify.js
| Function | Purpose |
|----------|---------|
| `getProducts()` | Fetch product list, optionally by collection handle. Supports pagination. |
| `getProduct(handle)` | Single product detail (images, variants, options, vendor, tags) |
| `searchProducts(query)` | Text search across products |
| `getCollections()` | Get all collections/brands (up to 30) |
| `createCart()` / `getCart()` | Cart management |
| `addToCart()` / `updateCartLine()` / `removeCartLine()` | Cart line operations |
| `goToCheckout()` | Redirects to Shopify-hosted checkout via `cart.checkoutUrl` |
| `customerLogin()` | OAuth redirect to Shopify authorize endpoint |
| `handleAuthCallback()` | Exchange authorization code for tokens |
| `refreshAccessToken()` | Refresh expired access token |
| `getCustomer()` | Get customer name, email, phone, orders |
| `syncWishlistToShopify()` | Save wishlist to customer metafield (`custom.wishlist`) |
| `loadWishlistFromShopify()` | Load + merge wishlist from customer metafield |

### Client-side Storage
- `localStorage`: `shopify_cart_id`, `customer_access_token`, `customer_id_token`, `customer_refresh_token`, `customer_token_expires`, `ouji_wishlist`
- `sessionStorage`: `ca_code_verifier`, `ca_state`, `ca_nonce`, product cache (`product_{handle}`)

---

## 4. Site Structure

### Pages (18 main pages)
| File | Purpose |
|------|---------|
| `index.html` | Homepage — hero slider, brand marquees, featured collections, editorial, newsletter |
| `brands.html` | All brands page — dark smoke theme, makeup + skincare sections with logo grid |
| `category.html` | Product browsing with filters |
| `product.html` | Single product detail (reads `?handle=` URL param) |
| `cart.html` | Shopping cart |
| `account.html` | Customer account (OAuth redirect target) |
| `wishlist.html` | Wishlist page |
| `makeup.html` / `bodycare.html` / `fragrance.html` / `lifestyle.html` | Category pages |
| `about.html` / `story.html` / `contact.html` / `faq.html` / `shipping.html` / `terms.html` | Info pages |
| `column.html` | Blog/article listing |

### Articles (`/articles/`, 20 files)
Product ranking articles (Glow Pick, Olive Young, Hwahae), skincare guides (sensitive skin, acne, retinol, niacinamide, peptides, etc.), and makeup tutorials.

---

## 5. Design System & Visual Language

### Color Palette (CSS Custom Properties in `styles.css`)

**Primary — Teal blue (used for accents, buttons, links):**
```
--primary: #6395a6
--primary-light: #82afc1
--primary-lighter: #aecbd8
--primary-lightest: #daedf3
--primary-dark: #527d8d
--primary-darker: #3f6574
--primary-deep: #2e505c
```

**Dark base — Deep teal (used for dark sections, smoke theme):**
```
--dark-base: #1e3038
--dark-deep: #0f1a1e
--dark-mid: #1a2a30
```

**Warm — Cream/beige (used for product showcase sections):**
```
--warm-50: #fdf8f3  (lightest cream)
--warm-100: #f9efe4
--warm-200: #f0ddc8
--warm-300: #e4c9a8
--warm-400: #d4b48e
--warm-500: #c4a07a
--warm-600: #a8845e
```

**Accent:** `--accent: #89c4d4`

### Typography
- **Display/Brand font**: `League Spartan` (English headings, OUJI logo)
- **Chinese serif**: `Noto Serif TC` (editorial Chinese headings)
- **Body font**: `League Spartan` + `Noto Sans TC` (bilingual body text)

### Spacing Scale
`--space-xs: 4px` → `--space-5xl: 128px`

### Layout
`--max-width: 1440px`, `--header-height: 64px`

---

## 6. Design Decisions & Rationale

### Dark Smoke Theme (brands page + homepage brand sections + newsletter)
- **Background**: `#1a2a30` dark teal base
- **Smoke video**: `videos/smoke-bg-short.webm` (232KB) / `smoke-bg-short.mp4` (410KB), 12-second loop, trimmed from original 89-second 7.1MB file
- **Video styling**: `opacity: 0.4; filter: saturate(0.5) brightness(0.7)` with dark gradient overlay
- **Cards**: Solid `rgba(36,56,64,0.75)` background (NOT frosted glass — `backdrop-filter` was removed for scroll performance)
- **Logos**: White via `filter: brightness(0) invert(1); opacity: 0.85`
- **Why**: Creates atmospheric, premium K-beauty feel. Originally had `backdrop-filter: blur(16px)` on 50+ cards which caused GPU overload with the fixed video background. Replaced with solid semi-transparent backgrounds.

### Brand Intro Section (homepage "關於 OUJI")
- **Static radial glow gradient** — no video
- **Why**: Sits directly above the smoke brand marquees section. Using the same smoke video would be visually repetitive. The "calm static → dynamic smoke" rhythm creates better section separation.

### Section Rhythm on Homepage
The page alternates between dark and light sections:
1. Hero (full-width image slider) → dark
2. Brand marquee bar → dark
3. Brand Intro "關於 OUJI" → dark (static gradient)
4. Brand Marquees "Our Brands" → dark (smoke video)
5. Featured Collection → light/cream (米色)
6. New Arrivals → light/cream (米色, `section--warm`)
7. Editorial → light/cream
8. Newsletter → dark (smoke video)
9. Footer → dark

**Why the light cream/beige sections exist**: Product images pop better on light backgrounds. The warm cream (`--warm-50: #fdf8f3`) creates a comfortable shopping experience and contrasts well with the teal blue. This is a complementary color pairing (teal ~195° + cream ~35° on the color wheel).

### Brands Page Specifics
- **Makeup section**: Warm-tinted borders `rgba(200,150,120,0.1)`, warm label pill
- **Skincare section**: Cool-tinted borders `rgba(100,170,190,0.1)`, cool label pill
- **Divider**: Glowing gradient line between sections (`.brands-divider`)
- **Card aspect ratio**: `2:1` with `padding: 10px 6px` (mobile) / `10px 8px` (desktop)

### Logo Sizing on Brands Page
Logos are categorized by visual weight, NOT mathematical size. Each has custom `max-width` / `max-height` rules via CSS attribute selectors:

| Category | Logos | max-width | max-height | Why |
|----------|-------|-----------|------------|-----|
| Standard (thin text, 4:1 SVGs) | rom&nd, hince, peripera, etc. | 92% | 65% | Default — thin letterforms need full width |
| Bold/heavy | COSRX, Torriden, ANUA | 50% | 32% | Thick letterforms appear larger at same size |
| Extra bold | Abib | 24% | 24% | Very heavy font, needs extreme reduction |
| Medium bold | beplain | 42% | 36% | Medium weight |
| Ultra-wide & heavy | SKIN1004, AXIS-Y, innisfree, Dr.Jart+ | 65% | 55% | Wide aspect ratio + heavy font |
| Special (dasique) | dasique | 92% | 75% | 3:1 ratio, needs max-height as binding constraint |

Desktop (640px+) has slightly reduced values. **Do not change these without visual testing** — they were tuned over multiple iterations.

### Primary Blue (#6395a6) Usage
The primary blue is intentionally used sparingly — as an **accent/interaction color only**, not as a background or dominant visual element. It appears in:
- Buttons and CTAs
- Link hover states
- Sale prices (strikethrough)
- Small labels and category markers

The owner finds the light blue "唔係好靚" (not very attractive) as a dominant theme color, and prefers the dark teal aesthetic. The blue may be refined or brightened in future iterations — currently at HSL(195°, 25%, 52%) which is quite desaturated.

---

## 7. Key CSS Architecture Notes

### Performance Optimizations
- **No `backdrop-filter`** on brand cards or marquee items — was removed because 50+ blurred elements + fixed video = GPU overload on scroll
- **Specific `transition` properties** instead of `transition: all` — prevents paint artifacts on initial render (logos appearing to "fade in")
- Cards use solid semi-transparent backgrounds instead of frosted glass

### CSS Specificity
- Per-logo sizing uses `img[alt="..."]` selectors (specificity 0,2,1)
- These override base `img` rules (0,1,1) even across media queries
- The `!important` on `.newsletter` background override exists because of a later warm+blue gradient rule that would otherwise win

### `styles.css` Structure (~3,500 lines)
The file is monolithic (no CSS modules or preprocessor). Key sections:
1. CSS custom properties / design tokens (lines 1–40)
2. Global resets and base styles
3. Header / navigation
4. Section layouts
5. Brand intro section (~line 200)
6. Buttons
7. Hero section
8. Product cards
9. Brands page dark theme (~line 886)
10. Brand card sizing rules (~line 1048)
11. Newsletter (~line 1255)
12. Dual brand marquees (~line 2540)
13. Warm section overrides (~line 2710)
14. Mobile bottom navigation (~line 3100)

---

## 8. JavaScript (`script.js`, 758 lines)

Zero-dependency animation and interaction layer:
- **Scroll reveal**: IntersectionObserver-based (`.reveal`, `.reveal-blur`, `.reveal-stagger`, `.reveal-scale`, `.reveal-left`, `.reveal-right`, `.reveal-clip`)
- **Parallax**: General + hero-specific (shrink/fade on scroll)
- **3D tilt**: On product cards
- **Magnetic hover**: On buttons
- **Cursor glow**: On hero section
- **Count-up**: Number animations
- **Marquee**: Hover-pause, brand marquee toggle (grid/marquee view switch)
- **Mobile nav**: Toggle sidebar
- **Product page**: Tabs, quantity, variant selectors
- **Safety fallback**: Forces all `.reveal` elements visible after 2 seconds if IntersectionObserver hasn't triggered

---

## 9. Assets

| Folder | Contents |
|--------|----------|
| `/logos/` | 63 brand logo files (SVG, PNG, JPG) |
| `/assets/images/` | Hero slider images (hero-1 to hero-4, desktop + mobile variants, PNG) |
| `/videos/` | `smoke-bg-short.webm` (232KB), `smoke-bg-short.mp4` (410KB), `smoke-bg.mp4` (7.1MB original, can be deleted) |
| Root | `ouji-logo-color.png`, `ouji-logo-white.png` |

---

## 10. Known Issues & Future Considerations

1. **`smoke-bg.mp4` (7.1MB)** still exists in `/videos/` — the trimmed versions (`smoke-bg-short.*`) are what's actually used. The original can be deleted to save repo size.
2. **Primary blue saturation** — owner has expressed interest in potentially brightening `#6395a6` to something more vivid (e.g., `#4daac4`) in the future.
3. **innisfree SVG** was manually cropped — viewBox changed from `0 0 720 720` to `62 312 596 95` with white background rect removed.
4. **Dr.Jart+ logo** was cropped from 600x600 to 560x127 using Python PIL.
5. **No README.md** existed before this document.
6. **Shopify API version** is `2024-01` — may need updating.
7. **GitHub Pages + Vercel dual deployment** may cause confusion — consider disabling one.
