# 呢個 project 屬於 OUJI

**開工前先讀 `~/ouji/`** —— 嗰度係所有 OUJI session 嘅共同記憶：

- `~/ouji/STATE.md` — 三間鋪同盤生意嘅現況
- `~/ouji/OPEN-QUESTIONS.md` — **問過但未有答案嘅嘢，唔好再問老闆一次**
- `~/ouji/topics/website.md` — 呢個範疇之前做過乜

**收工前**：更新 `~/ouji/topics/website.md`；如果對盤生意嘅理解有改變就更新 `~/ouji/STATE.md`；落咗決定就追加一行落 `~/ouji/DECISIONS.md`。

⚠️ **`~/ouji/` 只放筆記同結論，唔放 code、圖、數據檔。** 呢個 project 嘅檔案照舊留喺呢個資料夾，唔好搬過去。

---

# 產品上架四條硬規矩（老闆 2026-09-19 定死，唔准跳）

> 「條碼係最緊要嘅，條碼就係個身份證。你可以攞條碼、個名、搵到嘅圖，
> 同埋搵到嘅產品嚟做交叉對比，呢啲嘢真係唔應該錯。」
> 「個產品本身條碼係十件裝，點知個圖係二十件裝……啲客人會嘈㗎。」

**條碼 = 身份證。** 產品叫乜、係邊個型號、幾多裝，一律由 variant barcode
反查 `/Volumes/core/ouji-pos/raw/*barcodes*.csv` 嘅**老闆 POS 名**決定。
唔准靠 handle 估、唔准靠英文系列名估、唔准靠搜尋結果第一個答案。

### 1. 封面唔准印住「送贈品」
封面圖有 `증정`／`사은품`／`추가증정`／`GIFT`／`리필＋씰`／「加贈」呢類字眼，
而我哋**實際唔會送**，就唔可以用。改法：
① 同一件貨有乾淨圖就調次序做封面；② 冇就裁走贈品格；③ 都唔得就另外搵官方圖。
個名本身講明「附贈／附補充裝／套裝」就唔算呃人。

### 2. 分類要擺清楚
每件貨一定要有 `productType`，而且要落到至少一格分類。落唔到＝客淨係
喺「其他」見到。判斷 section 一律行 `shopify.js` 嘅 `sectionMatch()`，
唔准另寫一套 keyword。

### 3. 名同圖要對正同一隻貨
**同一個系列唔同型號係最易錯嗰類**（實例：CLIO `Kill Cover` 底下
Founwear／The New Founwear／Mesh Blur／Skin Fixer／Mesh Glow／High Glow 六隻，
中文名先分得清）。裝量亦一樣：10 條裝唔可以擺 20 條裝嗰張圖。
上圖之前：**條碼 → POS 名 → 官方站產品頁 → 圖**，四步對齊先落。
韓妝品牌通常有香港官方 Shopify 站，`/products/<handle>.json` 直接攞到原圖清單。

### 4. 上架一定要過閘
```bash
python3 scripts/listing_check.py <handle>      # 上架前／改完圖
python3 scripts/listing_check.py --all         # 全店掃，有 🔴 就 exit 1
```
`scripts/publish.py` 嘅 `publish()` **每次都會自動行呢個閘，有 🔴 就直接擋住唔上架**。
真係要硬上（例如 POS 未入碼嘅新貨）先 `OUJI_SKIP_LISTING_CHECK=1`，
而且要喺 commit message 寫明點解。

封面 OCR 靠本機 Apple Vision（零 API 成本），venv 喺
`/Volumes/core/AI-Workspace/Claude/ouji-image-audit/venv`。
venv 唔喺度個閘會講明「未驗」—— **未驗唔等於通過**。
