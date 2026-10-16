# 多來源評價（Olive Young／@cosme／YesStyle）

2026-10-16 起，`data/ratings.json` 同 `data/reviews/<handle>.json` 唔止 Olive Young。
Winston 原話：韓國貨用 Olive Young，日本貨用 @cosme，兩邊都冇先搵其他網店，評論要譯返中文。

## 資料格式

`data/ratings.json` 每件：`{star, count, text?, src?, max?}`

| src | 來源 | 滿分 | 卡上寫 |
|---|---|---|---|
| 冇寫／`oy` | Olive Young Global | 5 | Olive Young |
| `cosme` | 日本 @cosme | **7** | @cosme，分數後面加「/7」 |
| `ys` | YesStyle | 5 | YesStyle |

**@cosme 唔換算做 5 分制**：換算咗嘅數對方網站搵唔到，客人查唔返，等於作數。
@cosme 頁面本身冇分數（顯示 0／-pt）嘅貨，唔放星，亦唔准用評論自己計平均。

## 邊度用、邊度唔用

- 顯示（產品卡、產品頁標題下、評價區）：三個來源都用，`reviews.js` 嘅 `RATING_SOURCES` 決定字眼。
- 揀貨同排序（`catalog.js` popScore／品牌名氣、`home.js` 熱賣 tab 同熱門格）：**三個來源都計**
  （Winston 2026-10-16「計」；之前一版只計 Olive Young，superseded）。
  @cosme 評得嚴，排序內部按百分位對齊換算（`RANK_STAR`：4.0→4.5、4.9→4.67、5.6→4.8），
  評論數 log 封頂 1；呢個換算只用嚟排先後，網站顯示照寫原分。熱賣文案改做「日韓網站最多人評價嗰批」。
- 專欄腳本（`scripts/articles/*`）寫死「Olive Young 評分」，載入時剔走其他來源。
- 舊 `scripts/merge_reviews.py` 只會清 Olive Young 嘅檔，唔會再 rmtree 成個資料夾。

## 收錄規矩（`scripts/reviews_multi/build.py`）

同舊 Olive Young 一樣：負評一定留、剷 spam／重覆、剷講價錢（兩邊售價唔同）。另外加：
- 剷醫療功效字眼（治る／完治／cure／根治…）—— 香港《不良醫藥廣告條例》。
- 剷講店舖／送貨／客服（shipping、customer service、配送、届いた…）—— 唔係講產品。
- 譯文用原文 sha1 做鎖匙（`trmap.py`），唔用「第幾則」：篩選一改次序就變，用位置會配錯原文。

## 點攞資料（實測）

- **Olive Young**：品牌／分類／搜尋頁被 Cloudflare 人機驗證擋（唔准撳）。用 JSON API：
  `product/detail-data`、`review-summary`、`review-list`、`relation-list`（session＋CSRF，`oyapi.py`）。
  目錄靠 `relation-list` 由已知產品擴散（`oy_crawl.py`）。
- **@cosme**：伺服器直出（Shift_JIS）。品牌產品列表 `/brands/<id>/product/?page=N` 有名、分數、評論數；
  評論列表 `/products/<id>/review/`，截斷咗嘅開 `/reviews/<rid>/` 攞全文。
  **會限流**（約 100 個請求封 5 分鐘）：`cosme.py` 全程序一條隊、每 5 秒一個請求，撞到自動等。
  站內搜尋只出文章，品牌編號用 WebSearch `site:cosme.net` 搵。
- **YesStyle**：搜尋頁直出產品列表；評論用 `api.yesstyle.com/api/public/product/productDataReview-init`
  （token 喺頁面入面）。好多日本牌同部分韓牌（DHC、WAKEMAKE、Torriden）YesStyle 冇賣。

## 流程

1. `oy_crawl.py`／`cosme_catalog.py`／`ys_catalog.py` 攞目錄
2. `make_jobs.py oy|cosme`、`make_jobs_ys.py` 出每個品牌嘅配對 job
3. 子代理按 `match.md`／`match-ys.md` 配對 → `check_match.py <mode>`（類型閘）→ **人手逐行核對**，剷走嘅寫入 `reject-<mode>.json`
4. `fetch_oy.py`／`fetch_cosme.py`／`fetch_ys.py` 攞評分同原文
5. `build.py` 清洗、每件揀 8 則、出 `tr-in/` 翻譯批次 → 子代理按 `translate.md` 譯 → `tr-out/`
6. `merge.py --write` 寫入 `data/`

工作檔預設喺 `REVIEWS_WORK`（2026-10-16 嗰次：`/Volumes/core/AI-Workspace/Claude/ouji-reviews-fill-20261016/work`）。
