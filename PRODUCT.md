# Product

<!-- impeccable:product-schema 1 -->

> **寫呢份嘅情況**：老闆叫「仲唔整？」＝ 授權我唔問直接推斷。
> 凡標住 `[推斷]` 嘅係我由 repo、POS 同 `~/ouji/COMPANY.md` 推出嚟，**未經老闆確認**。
> 標住 `[確認]` 嘅有實質來源。標住 `[未知]` 嘅唔准當成事實用。
> 2026-08-18 寫。

## Platform

web

## Stack

已有 codebase：純靜態 HTML／CSS／JS，冇 framework、冇 build step。
資料行 Shopify Storefront API（store `5rerjn-mt`），push 上 `origin` 自動部署去 Vercel。
Admin 操作行 `scripts/shopify_admin.py`。

## Users

`[推斷]` 主要係喺香港搵韓國美妝護膚嘅消費者，多數用手機。
兩種情況混住：
- **認得 OUJI 嘅人**（油塘大本型、觀塘工業中心三間鋪嘅客）上嚟查有冇貨、幾錢、邊間鋪有
- **唔認得 OUJI 嘅人**由社交平台或者搜尋入嚟，第一次見呢個牌子

`[未知]` 兩者比例。網店一個月做幾多生意亦都完全未知。
`[未知]` 手機／電腦比例 —— 2026-08-13 裝咗 Microsoft Clarity，但未讀過數。

## Product Purpose

OUJI 嘅網上店：畀客揾到、睇得明、買得到佢哋 56 個韓國品牌嘅貨。
`[未知]` 老闆未講明網店成功係「網上直接落單」定「引人入實體舖」。

## Positioning

`[確認]` **同場 56 個品牌**（老闆講 20 個彩妝 + 30–40 個韓國護膚；Shopify 目錄實際 56 個，
數字對得上）。老闆嘅講法係香港冇第二間零售店做到呢個品牌深度。
品牌深度前列：Round Lab 61、Some By Mi 60、Skinfood 55、Skin1004 50、Abib 49。

`[確認]` 但呢個優勢客未必知道 —— 8 個月 44 篇 IG 帖只推廣過 19 件貨（約佔目錄 2.4%）。
**「客根本唔知你有」係目前最有可能嘅生意問題。** 網站要對抗嘅就係呢樣。

## Operating Context

三間實體鋪：油塘大本型地下 37 號舖（Ouji YT）、大本型 1 樓 127 號舖（Asahikan）、
觀塘工業中心一期地下 B 舖。三間合計月做約 $130 萬。

`[確認]` 目錄規模：807 件產品、2,289 個變體、56 個品牌、4,221 張圖。
每晚自動備份去 `/Volumes/core/ouji-backup`。

## Capabilities and Constraints

- 冇貨嘅唔可以賣得 —— 要封鎖落單，出「通知我補貨」
- `[確認]` **成分濃度一律唔顯示**（模型推斷出嚟嘅成分唔可以出喺產品頁）
- 改 Storefront query 一定要 `CACHE_VERSION` +1
- 分類頁：護膚 `category.html`、彩妝 `makeup.html`，另有 `lens.html`、`kpop.html`
- 彩妝子分類**只可以信產品名，唔可以信 tag**（tag 入面高光被標成頰彩、胭脂標成修容）。
  正式分法喺 `scripts/makeup_subcats.py`
- 彩妝現貨：底妝 46、眼妝 50、唇妝 58、頰彩 16、修容 12，合共 182 件、23 個品牌

## Brand Commitments

- `[確認]` 配色統一用 footer 嗰隻藍 `#2b4c58`（`--dark-base`）
- `[確認]` 品牌 logo 搵得返就唔准用文字頂替
- `[確認]` 唔准用套版文案（曾經 24% 護膚品用緊套版描述，已經係被彈過嘅嘢）
- 名：OUJI／王子。IG `@ouji_kbeauty`、FB `Oujihk`

## Evidence on Hand

- **真目錄、真相、真件數**：所有原型用嘅相同數字都由 Storefront API 即時攞，唔准填充
- `[確認 2026-08-18]` **目錄入面本身就有韓國模特／情境相**，唔係淨得白底 packshot。
  （之前紀錄寫低話「我哋淨係得白底 packshot，改 CSS 追唔到 Olive Young 嘅韓式感」，
  呢句係錯嘅，已推翻。）
- `[確認]` 部分產品相 Shopify 後台放錯咗（例：CLIO 睫毛膏顯示緊支唇釉），
  已知壞相名單喺 `scripts/makeup_subcats.py` 嘅 `BAD_IMAGE`
- `[未知]`／**唔准作**：網店營業額、轉換率、客評、銷量排名、「熱賣」「第一名」呢類講法
  —— 冇數據支持，一律唔准出現喺頁面

## Product Principles

1. **深度要睇得見。** 56 個品牌係唯一嘅真優勢，但客唔知。頁面要令品牌數量成為第一眼睇到嘅嘢。
2. **示範資料一定要真。** 老闆憑 demo 判斷，demo 作假比 code 出錯更嚴重。
3. **貨要快見到。** 對手 Olive Young 分類頁第一件貨喺 219px；我哋目前 677px 起。
4. **講得出嘅嘢先講。** 冇數據就唔准講「熱賣」「人氣」「排名」。

## Accessibility & Inclusion

冇特別確立過標準。內容係繁體中文（香港），產品名混住中英韓。
