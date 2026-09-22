# OUJI 三個產品頁品牌輪播 — Design QA

## 2026-09-21 — 季節性產品及細品牌歸類

- 護膚頁喺 collection 與 taxonomy 合併後再次硬性排除潤手霜、手部護理、潤唇膏、護唇膏、唇部精華及唇膜；相關產品保留喺季節性頁。
- 所有分類頁共用同一品牌門檻：品牌喺目前分類得 2 件或以下產品時，品牌篩選、品牌導覽及產品分段一律合併為「其他」。
- 「其他」固定排喺獨立品牌之後；3 件或以上先保留獨立品牌段落。
- 「其他」內按原品牌連續排列；每個小組第一張卡有細型品牌 pill 及輕量邊框，產品卡本身仍顯示原品牌名。
- So Natural FIXX 定妝噴霧以精確品牌＋產品名例外加入護膚，同時保留彩妝歸類；例外唔會放寬至其他定妝產品。
- 護膚頁硬排除彩妝、假睫毛、CC Cream／底妝、護髮及保健品；只得一至兩件貨嘅細品牌防曬集中到季節性。
- 蠟筆小新防曬及 ATOPALM 兩款兒童防曬已於季節性頁核對；miru miru、CORINGCO、AN' BLESS 已於彩妝頁核對。
- 靜態語法、diff whitespace、護膚頁實際產品標題掃描、品牌列／產品段落／篩選一致性及 console 已驗收。

final result: passed

---

## 2026-09-21 — 護膚焦點桌面箭嘴融入輪播邊緣

- source visual truth: `/var/folders/z_/ygspprr92sv_g1p2bhq28fzw0000gn/T/codex-clipboard-7ad31e7c-c5eb-4fdc-8f1d-c78b29400f06.png`
- implementation screenshot: Codex IAB tab 2 inline capture；local preview `http://127.0.0.1:8765/category.html`
- viewport: desktop `1146px` CSS width；mobile interaction check `390 × 844px`
- state: desktop focus carousel first position；mobile first position

### Findings

- 冇剩餘 P0／P1／P2。桌面箭嘴層由卡頂伸到卡底，外側使用同頁面完全一致嘅 `#f7f9f9`，跨入卡面後先逐步透明，幼線箭嘴貼住可視邊界。
- Fonts/typography：本次無文字改動；焦點圖內文字及網站標題保持原樣。
- Spacing/layout：實測 card、左右箭嘴層均為 `244px` 高，top／bottom 完全對齊；箭嘴層 68px 闊、跨出輪播 20px，冇佔用 dots 或增加 section 高度。
- Colors/tokens：箭嘴層外側 `rgb(247,249,249)` 與 body 背景完全一致，再向 card 變透明；沿用 OUJI 深藍箭嘴，hover 只輕移 3px。
- Image quality/assets：四張焦點圖完全不變，冇重新裁切、拉伸或覆寫圖像內容。
- Copy/content：畫面文字不變；`上一組`／`下一組` 只保留作 accessibility name。
- Responsive：desktop 實測右箭嘴將 `scrollLeft` 由 0 推至 599、active page 由 0 轉 1；390px 手機兩個箭嘴均為 `display:none`，viewport 保留 `overflow-x:auto`，可手指滑動。

### Comparison history

1. P2 — 原本圓形白掣與首頁分類 rail 視覺語言不一致。修正：改用邊緣淡出帶與幼線箭嘴。
2. P2 — 第一輪淡出帶只得 104px 高，而且純白與頁面底色斷開，形成細方塊。修正：高度改為精確跟 card，外側改用 `--bg-primary`；post-fix 實測三者 top／bottom 同線、背景 RGB 完全相同。

### Implementation checklist

- [x] 桌面箭嘴改為邊緣淡出樣式
- [x] 左右箭嘴貼住輪播外緣並保留 click navigation
- [x] 手機完全隱藏箭嘴並保留 swipe
- [x] desktop／mobile interaction、JavaScript syntax、diff whitespace 驗收

final result: passed

---

## 2026-09-21 — 修正正常／置頂品牌卡狀態

- source visual truth: 用戶確認規格：未滾動保留原本彩色正方形品牌卡；滾動置頂後先過渡為白色 Logo 導覽條
- implementation: `http://127.0.0.1:8765/category.html?preview=sticky-brand-v2`

### Findings

- 正常狀態重新使用原有品牌 artwork，冇再統一改成白色 Logo 卡；排序仍嚴格跟產品 section，由 Skin1004 起首。
- sticky 狀態先隱藏 artwork 背景並顯示品牌 Logo／文字，維持 `92 × 42px` 白色 pills、active 指示、auto-center、點擊跳轉及進度功能。
- 原 artwork 集合以外嘅品牌冇對應彩色資產，正常狀態保留 Logo／文字 fallback，唔虛構新 artwork。
- `node --check`、`git diff --check` 通過；desktop 正常／sticky 畫面及 console 已驗收。

final result: passed

---

## 2026-09-21 — 護膚品牌排序及置頂過渡

> 此段正常狀態設計已被上方修正取代；排序及 sticky 行為記錄仍有效。

- source visual truth: `/var/folders/z_/ygspprr92sv_g1p2bhq28fzw0000gn/T/codex-clipboard-09bc65db-a59a-4e3c-862b-561bb5e11510.png`，加用戶確認嘅「低彩度正方形 Logo 卡 → 置頂白色 Logo 導覽條」方案
- implementation: `http://127.0.0.1:8765/category.html?preview=sticky-brand-v2`；Codex IAB 正常及 sticky 即時 capture
- viewport/state: desktop `1190 × 1258` CSS px、DPR 2；正常品牌區及 Round Lab sticky／active 狀態

### Findings

- 冇剩餘 P0／P1／P2。品牌卡以 `.brand-section` 排序為唯一資料來源，實測頭八張同產品分段逐個一致：Skin1004、Round Lab、Anua、Beauty of Joseon、Abib、COSRX、VT Cosmetics、Some By Mi。
- 正常狀態統一為低彩度暖白正方形卡，移除原先精選 artwork 帶來嘅多色背景；現有品牌 Logo 圖檔保留原色，冇重畫或濾色。
- sticky 狀態由 82px 方卡過渡成 `92 × 42px` Logo pill；背景改為半透明暖白玻璃，非目前品牌 opacity 收至 .76，目前品牌用 OUJI 藍邊及底線辨識。
- 點擊 Round Lab 實測成功跳到 `#brand-1`、sticky 生效、active 同步為 Round Lab、自動橫移保留；舊 `.brand-rail` 及 `[data-brand-strip]` 均為 0。
- Fonts/typography：品牌 Logo 使用現有 raster／vector asset；缺 Logo 品牌沿用小型網站字體 fallback，無新增字款。
- Spacing/layout：正常卡縮至 82–104px；sticky 卡 42px 高，標題收起，保留纖細進度線。
- Colors/tokens：背景只用暖白、淺灰藍玻璃及 OUJI 藍 active 狀態；無多色卡底。
- Image quality/assets：所有 Logo 使用現有 `brandLogo()` 對應資產及 `object-fit: contain`，無拉伸或重新生成。
- Copy/content：品牌名稱、98 個實際產品品牌及產品 section 保持不變。
- Console：Codex IAB 實測 0 error；`node --check`、`git diff --check` 通過。

### Comparison history

1. P1 — 品牌列沿用精選 artwork 次序，Anua 起首但產品由 Skin1004 起首。修正：每次 render 直接按產品 `order` 重建 98 張品牌卡。
2. P2 — 彩色 artwork 卡與後加白色 Logo 卡混雜。修正：全部統一為暖白 Logo 卡，保留 Logo 原色。
3. P2 — sticky 收矮後點擊 Round Lab 嘅判定線差約十幾像素，active 一度停留 Skin1004。修正跳轉 offset 後，實測 active=`Round Lab`、targetTop=`217px`。

### Implementation checklist

- [x] 品牌順序完全跟產品 section
- [x] 正常狀態低彩度、Logo 保留原色
- [x] sticky 平滑縮成白色 Logo pills
- [x] active 藍色指示、auto-center、click jump 保留
- [x] 舊品牌列完全移除
- [x] desktop 正常／sticky 狀態及 console 驗收

final result: passed

---

## 2026-09-21 — 護膚焦點控制列精簡

- source visual truth: `/var/folders/z_/ygspprr92sv_g1p2bhq28fzw0000gn/T/codex-clipboard-3f5bbdee-bfeb-4b52-b206-b8bc3c32e2ce.png`、`/var/folders/z_/ygspprr92sv_g1p2bhq28fzw0000gn/T/codex-clipboard-09bc65db-a59a-4e3c-862b-561bb5e11510.png`
- implementation: `http://127.0.0.1:8765/category.html?preview=sticky-brand-v2`；Codex IAB 即時 capture
- viewport: `1190 × 1258` CSS px、DPR 2；source screenshots 分別為 `2902 × 814`、`2322 × 568`，以相同 desktop layout region 作比例比較
- state: desktop，焦點第 1／第 2 頁及品牌區同屏

### Findings

- 冇剩餘 P0／P1／P2。原本「上一組／下一組」文字膠囊已移除，改成焦點卡左右邊緣嘅圓形箭嘴；按鈕仍有 aria-label、disabled、focus 及 reduced-motion 行為。
- 桌面四張焦點卡採逐張前進，形成三個有效位置 `[1+2] → [2+3] → [3+4]`，所以只顯示三粒點；實測右箭嘴由第 1 頁前進至第 2 頁，active dot 同 scrollLeft 同步。
- controls 高度由約 40px 收至 18px、卡下間距收至 5px；焦點與品牌 section gap 收至 10–16px，畫面冇再為文字翻頁掣留出大幅空白。
- Fonts/typography：刪除控制文字，保留既有標題字款；冇新增字體。
- Spacing/layout：箭嘴疊放於卡面兩側，三點緊貼卡下；desktop 畫面可同時見到焦點、品牌列及篩選列。
- Colors/tokens：箭嘴使用半透明暖白玻璃底及既有深藍文字色；唔新增搶眼色塊。
- Image quality/assets：四張焦點 raster 完全不變，冇裁切、拉伸或重製；箭嘴沿用網站既有線性 SVG icon 語言。
- Copy/content：畫面不再顯示「上一組／下一組」，accessibility name 仍保留。
- Console：Codex IAB 實測 0 error。

### Comparison history

1. P2 — 文字翻頁掣加 12px 下距令控制區過高。修正：左右箭嘴移入卡面邊緣，dots margin 改為 5px、controls 高度改為 18px。
2. P2 — 四張卡以兩張為一頁時只得兩粒點，唔符合指定三點。修正：desktop 保持兩卡可見但每次前進一張，形成三個有效位置。

### Implementation checklist

- [x] 只顯示三粒點
- [x] 左右箭嘴取代文字翻頁掣
- [x] 收緊焦點控制列及兩個 section 上下留白
- [x] 箭嘴、dots、鍵盤及 swipe 行為保留
- [x] desktop 實際畫面、翻頁、console 驗證

final result: passed

---

## 測試基準

- source visual truth: `/Volumes/core/Projects/OUJI/Website-and-Design/ouji-brand-section-exact/source-exact-user.png`
- production assets: repo `assets/brand-carousel/`（11 張、2151/2152 × 731 WebP）；原始 PNG 保留於 `/Volumes/core/Projects/OUJI/Website-and-Design/ouji-brand-carousel/assets/`
- 全部產品 desktop screenshot: `/Volumes/core/claude-work/ouji-brand-carousel-qa/shop-desktop.png`
- 彩妝 desktop screenshot: `/Volumes/core/claude-work/ouji-brand-carousel-qa/makeup-desktop.png`
- 護膚 desktop screenshot: `/Volumes/core/claude-work/ouji-brand-carousel-qa/skincare-desktop.png`
- desktop viewport: 1440 × 1000；品牌區實測 1344 × 456 artwork＋42 px controls
- mobile viewport: Browser 最小可測 500 × 844；品牌區 `clientWidth=448`、`scrollWidth=1792`

## Findings

- **無剩餘 P0／P1／P2。** 三頁都沿用用戶指定第 3 款嘅左右構圖、原色品牌字樣、柔和產品質感同 4×2 品牌矩陣。
- **指定差異。** 來源樣板品牌卡右下角圓形箭嘴已按用戶要求移除；翻頁控制只放喺整個 section 下方，唔再混入品牌卡。
- **輪播密度。** 全部產品 4 版、彩妝 3 版、護膚 4 版；桌面有上一版／下一版及相同數量圓點，手機保留 swipe/scroll-snap。
- **速度。** 11 張輪播圖由合共約 18 MB PNG 轉為約 1.0 MB WebP（減少約 94.4%）；後續版改為互動時才載入。彩妝頁首次輪播傳輸由約 3.8 MB 降至約 90 KB（減少約 97.6%）。
- **Hover。** 原本硬藍色 inset 框已改成按頁面色調嘅 liquid-glass 微互動：護膚青綠、彩妝粉紅、全部產品藍色；有柔光、輕微浮起同掃光，鍵盤操作所需 `focus-visible` outline 保留。
- **全部品牌。** 按用戶要求移除全部品牌 hotspot，並以同一 artwork 紋理無縫遮蓋 raster 內原有文字，唔影響品牌卡連結。

## 五個 fidelity surfaces

- **Fonts and typography:** 品牌名稱、焦點標題、CTA 同分類標題都直接保留喺高解像 raster artwork，避免用網站字體重砌而走樣；翻頁文字沿用網站現有 UI 字體。
- **Spacing and layout rhythm:** desktop 維持來源 2152:731 比例、左焦點／右 4×2 比例、卡距及圓角；controls 置中並與 artwork 保持 12 px 間距。mobile 將同一 artwork 分拆成上方焦點圖及下方品牌矩陣，冇壓細 logo。
- **Colors and visual tokens:** 每頁保留類別色調（全部／護膚藍綠、彩妝粉紅），品牌字樣及卡面以原色顯示；active dot 用網站藍色，disabled button 仍有足夠狀態差異。
- **Image quality and asset fidelity:** 11 張 artwork 全部 2151/2152 × 731；已逐張檢查品牌字樣、產品構圖、無卡內圓形箭嘴、無偽造品牌。少於 8 個剩餘品牌嘅尾版以純產品質感填位，唔建立假連結。
- **Copy and content:** 保留「熱門品牌／熱門彩妝品牌／熱門護膚品牌」及「今週焦點」；移除「全部品牌」；品牌連結使用 catalog vendor 原名及 URL encoding。

## 互動、responsive 同 accessibility

- **全部產品：** 4 slides／4 dots；32 個品牌 hotspot及 4 個焦點品牌連結；首次只載入第 1 版，其餘按翻頁／swipe 需要載入。
- **彩妝：** 3 slides／3 dots；20 個真實品牌 hotspot；最後一版 4 個品牌加 4 個純裝飾格。最尾版實測 `scrollLeft=2688`、`clientWidth=1344`、下一版 disabled。
- **護膚：** 4 slides／4 dots；30 個真實品牌 hotspot；最後一版 6 個品牌加 2 個純裝飾格。最尾版實測 `scrollLeft=4032`、`clientWidth=1344`、下一版 disabled。
- **連結抽查：** `makeup.html?brand=AMUSE` 正確顯示 AMUSE active filter 及 16 張產品卡。
- **手機：** 500 px Browser viewport 下焦點圖及品牌矩陣完整分層、無水平頁面 overflow；controls 448 × 40，可 swipe、翻頁或按圓點。最終 crop 冇左側焦點圖殘邊。
- **Accessibility：** carousel／slide 有 role description；dots、品牌及焦點連結都有 aria label；active dot 用 `aria-current`；狀態由 `aria-live` 宣告；focus-visible outline 保留；reduced-motion 會改用無動畫翻頁。
- **Console：** carousel 0 error、0 warning。頁面本身仍有一項既有 form field id/name issue；護膚頁另有既有 catalog preload timing warning，均唔由本次修改引起。

## 比較歷史

1. **P1 — 單版設計未能展示更多品牌。** 修正：保留 exact artwork，每頁拆成 3–4 版，加入上一版／下一版、圓點及 scroll-snap。Post-fix evidence：三張 desktop screenshot。
2. **P1 — 舊 mobile 做法要橫掃成張 720 px artwork，logo 太細。** 修正：手機用同一 raster 分成焦點及品牌矩陣兩段，品牌卡保持可讀尺寸。
3. **P2 — mobile 品牌矩陣左邊曾露出焦點圖藍色殘邊。** 修正：右側 crop 改為靠右並放大 104%，最終 Browser visual inspection 無殘邊、無右側空白。
4. **P1 — 首頁輪播圖過重。** 修正：11 張 PNG 轉 WebP，並用 `data-src` 延遲載入未顯示 slides；三頁 fresh load 都只下載第 1 版。
5. **P2 — 品牌 hotspot hover 出現奇怪硬藍框。** 第一輪移除後欠缺互動提示；第二輪改成類別色 liquid-glass 柔光＋2 px 浮起＋掃光。護膚 Anua Browser 驗證使用青綠 `rgba(54,151,164)`、`brightness(1.07)`、`saturate(1.12)`，冇改動卡面內容。
6. **P1 — Hover 外框同品牌卡／焦點大圖錯位。** 第一輪修正只量度 `all-slide-1`，再將同一組座標硬套 11 張獨立排版 artwork；hover 本身仲有 `translateY(-2px) scale(1.012)`，令外框即使起點正確都會自行移位及放大。現時 11 張圖各自保存焦點大圖、4 欄、2 行嘅原圖像素邊界，render 時逐個 hotspot 換算百分比；mobile 亦逐格按 104% crop 公式換算。Hover 已取消位置／大小 transform，只保留玻璃柔光及掃光。三頁共 11 版 desktop、mobile 全量驗證：82 個品牌 hotspot＋11 個焦點大圖全部有尺寸、位於容器內、互不重疊；390 px 無 overflow，console 0 error。

## Implementation checklist

- [x] 全部產品 4 版
- [x] 彩妝 3 版
- [x] 護膚 4 版
- [x] 上一版／下一版、圓點、手機 swipe
- [x] 移除所有品牌卡圓形箭嘴
- [x] 原色品牌字樣及高解像 artwork
- [x] 品牌／焦點可點擊；移除全部品牌按鈕
- [x] WebP 壓縮及逐版 lazy load
- [x] 11 張 artwork 各自量度 hotspot；品牌卡及焦點大圖逐版對位
- [x] Desktop、mobile、interaction、responsive、console QA

final result: passed

---

# 護膚焦點輪播及品牌導覽修正 — Design QA（2026-09-21）

## 測試基準

- reference: `/var/folders/z_/ygspprr92sv_g1p2bhq28fzw0000gn/T/codex-clipboard-387ad0fc-c596-4abc-8f85-85caf5d6abdf.png`
- local preview: `http://localhost:8765/category.html`
- desktop viewport: `1440 × 900px`
- mobile viewport: Codex IAB 預設窄版 viewport

## Findings

- **焦點卡一致。** Round Lab、Anua、COSRX、Torriden 四張圖重新輸出為 `1600 × 755px`，徽章、品牌字位及 CTA 採用同一位置與比例，背景滿版，無白邊或拉闊。
- **輪播完整。** 桌面每頁兩張、共兩頁；窄版每頁一張並露出下一張卡。上一組／下一組、頁點及 live status 均可用，實測由第 1 頁切換至第 2 頁。
- **品牌列完整。** 保留 30 個正方形品牌卡，縮細桌面及手機卡片尺寸；可橫向滑動，進度線與 `01 / 30` 計數會隨位置更新。
- **Sticky 快速導覽。** 原有完整品牌快速跳轉列已恢復；向下捲動後固定頁頂，會按目前產品品牌高亮並自動將該品牌帶到可見範圍。
- **靜態檢查。** `node --check catalog.js` 及 `git diff --check -- catalog.js styles.css` 通過。

## Implementation checklist

- [x] 四張焦點卡使用統一視覺規格
- [x] 桌面兩張一頁、手機一張一頁並支援左右滑動
- [x] 所有 30 個品牌卡保留並縮細
- [x] 品牌卡進度提示保留
- [x] Sticky 品牌快速導覽及自動高亮／置中恢復
- [x] Desktop／mobile 實際畫面及互動驗收

final result: passed

---

# 護膚分類頁 Focus／品牌列修正版 — Design QA（2026-09-21）

## 測試基準

- desktop reference: `/var/folders/z_/ygspprr92sv_g1p2bhq28fzw0000gn/T/codex-clipboard-3660b5cd-a183-48ca-84f3-321884c55045.png`（原圖 2888 × 1380）
- breadcrumb detail: `/var/folders/z_/ygspprr92sv_g1p2bhq28fzw0000gn/T/codex-clipboard-c056fdfb-2291-4926-bf9e-ac63a97f51de.png`
- local implementation: `http://localhost:8765/category.html`
- generated focus artwork: `assets/brand-carousel/skincare-focus-round-lab-v2.png`、`assets/brand-carousel/skincare-focus-anua-v2.png`（各 1600 × 755；2.12:1）

## Findings

- **Focus 圖像：** 兩張圖均重新建立為原生闊幅構圖，背景延伸至四邊；卡片無白色外框，CSS 使用 `object-fit: cover`，無水平拉伸。
- **品牌比例及完整性：** 品牌卡固定 `aspect-ratio: 1 / 1`，保持正方形；由四組既有品牌資料合併成 30 個品牌，單行橫向滾動及 scroll snap 保留。
- **版面密度：** 收窄 focus、品牌列及篩選列之間垂直距離，避免原版過量留白。
- **資訊層級：** 標題改為「所有護膚品牌」並縮細；「首頁 / 護膚」移到篩選按鈕旁，移除原本獨立 breadcrumb 佔位。
- **互動驗證：** desktop browser 實測品牌列可拖動；accessibility tree 可讀出由 Anua 至 HEVEBLUE 共 30 個品牌連結。
- **範圍：** 本輪只驗收本地 desktop 修正版；responsive CSS 已保留正方形卡片與橫向滾動，但未聲稱已發布或 public/live。

## Implementation checklist

- [x] 無白邊、無 CSS 夾硬拉闊
- [x] 兩張 focus 圖為新闊幅素材，背景可安全裁切
- [x] 品牌卡保持正方形
- [x] 30 個品牌完整保留並可向右滾動
- [x] 留白收緊、breadcrumb 融入篩選列
- [x] 標題改為「所有護膚品牌」並縮細

final result: passed

---

# 護膚頁焦點／熱門品牌分拆 — Design QA（2026-09-21）

## 測試基準

- source visual truth: `/var/folders/z_/ygspprr92sv_g1p2bhq28fzw0000gn/T/codex-clipboard-b518f432-6311-49d9-9567-02062e7e5f7d.png`（1938 × 812）
- implementation: `http://localhost:8765/category.html`
- implementation screenshot: Codex in-app Browser 即時畫面（未能落地成獨立檔案）
- observed desktop viewport: 1108 × 720 CSS px，density 1
- state: 護膚首頁、無篩選、焦點及熱門品牌區可見

## Findings

- 已將「今週焦點」同「熱門護膚品牌」拆成兩個語義 section；桌面焦點為兩張同列，熱門品牌為 8 張單行卡。
- 熱門品牌卡直接裁切現有 skincare artwork，保留參考圖嘅底色、材質同品牌字款；下方舊品牌 rail 喺 skincare 模式停用。
- 「查看更多」已連到 `brands.html#skincare-brands`；每張焦點卡及品牌卡保留可聚焦品牌連結。
- 瀏覽器實際畫面冇見到品牌字樣重疊；桌面主要比例、間距同參考圖方向一致。
- 暫時焦點圖仍由舊 2151 × 731 artwork 裁切，唔係用戶將會重做嘅獨立闊圖，所以產品構圖只屬 layout placeholder。

## 五個 fidelity surfaces

- **Fonts and typography:** 沿用現有 OUJI 字體 token；熱門護膚品牌標題層級同參考一致。
- **Spacing and layout rhythm:** 桌面兩張焦點卡 1:1 平排；品牌 8 張單行；窄屏改為橫向 swipe。
- **Colors and visual tokens:** 沿用現有護膚 artwork 色彩及現有頁面 token，冇新增另一套 palette。
- **Image quality and asset fidelity:** 品牌 tile 用原 artwork 精準區域裁切；焦點圖等候新獨立資產替換 `focusArt`。
- **Copy and content:** 「今週焦點」、「熱門護膚品牌」、「查看更多」及品牌連結符合最新參考。

## Comparison history

- 首次畫面發現 screen-reader fallback 文字因專案冇全域 `.sr-only` 規則而疊喺品牌 artwork 上。
- 已加入 section-scoped visually-hidden 規則；重載後 8 張品牌卡只顯示 artwork 原字樣。
- 焦點圖右邊曾露出原 artwork 下一格品牌卡邊緣；已微調 placeholder crop，等待新焦點圖時保持乾淨邊界。

## Remaining blocker

- 未有同參考圖相同 1938 × 812 viewport 嘅已落地 implementation screenshot，亦未有用戶將重做嘅兩張正式焦點圖；因此無法做同尺寸合併圖比較。

final result: blocked

## 2026-09-21 — 彩妝細分類水彩 icon 更新

- Scope: 粉底、氣墊、遮瑕、眼影、眼線、睫毛膏、眉筆、唇膏、唇釉、唇彩，共 10 個細分類 icon。
- Style source: `makeup-watercolor-hero-mobile-clean.png`；沿用淡粉、霧藍、暖白及細緻水彩紙紋，移除舊款高飽和色、星星及粗黑卡通邊。
- Assets: 同名 PNG 及 WebP，透明背景，標準化為 `512 × 512`；內容透明邊已裁緊再留安全 padding。
- Runtime captures: `qa-makeup-subcats-base.png`、`qa-makeup-subcats-eye.png`、`qa-makeup-subcats-lip.png`。
- Result: 三組展開狀態全部可辨、冇切邊、冇錯圖、冇文字或 logo 混入；原有分類名稱、次序及互動不變。
- Remaining P0/P1/P2: none.

final result: passed

## 2026-09-21 — 彩妝手機分類列第二輪修正（已撤回）

- 呢次曾錯誤重建分類列及移除件數，破壞原本比例；用戶否決後已完整撤回，唔係現行實作。

final result: superseded

## 2026-09-21 — 彩妝手機 hero 最終修正

- 保留原始 `941 × 625` 畫布、構圖、分類列、五組分類圖、分類名稱及間距。
- 原圖局部移除三粒輪播點、最右箭嘴、箭嘴格分隔線，以及五個大分類件數；細分類件數亦收起。
- 分類帶原有效範圍 `0–879px` 拉滿原畫布 `941px`，消除箭嘴留下嘅右側空區，令左右外側留白平衡。
- 透明按鈕按原五格比例 `179 / 173 / 158 / 182 / 187` 鋪滿全寬，active indicator 跟新分隔線對位。
- Prototype capture: `qa-makeup-mobile.png`（headless Chrome，959px 手機 CSS 最大邊界，`?cat=cheek`）。
- 實截確認頰彩 active indicator 左右端精準對齊原圖第四格分隔線，頁面下面內容沒有重疊。
- Remaining P0/P1/P2: none.

final result: passed

## 2026-09-21 — 彩妝頁手機 hero 跟選定參考圖

- Source visual: `/Users/winstonli/Downloads/87B9988A-D36D-4721-8145-4C9E030C46F9.PNG`
- Prototype capture: `qa-makeup-mobile.png`（headless Chrome，500px；Chrome macOS headless 最小完整 viewport）
- Scope: `makeup.html` 手機版 hero；桌面版不變。
- Result: 水彩主圖、五格分類橫帶、文字及件數完整；底妝／眼妝／唇妝／頰彩／修容五個透明操作區仍在原位；下面 breadcrumb 及產品內容沒有重疊或橫向裁切。
- Remaining P0/P1/P2: none.

final result: passed

---

# 手機底欄「幫我揀」舊款三色無剔號 — Design QA（2026-08-31）

## 測試基準

- source visual truth: `/var/folders/z_/ygspprr92sv_g1p2bhq28fzw0000gn/T/codex-clipboard-433945db-bb78-46ce-bb59-b8b1d3627fa1.png`（舊款三張扇形色板＋右下圓晶體構圖；指定移除獨立 tick）
- colour truth: 上一版三色莫蘭迪 palette：灰粉 `#B89AA1`、霧藍 `#8AAEB8`、暖灰褐 `#B4AA98`
- implementation full screenshot: `/Volumes/core/AI-Workspace/Inbox/Legacy-Unattributed-20260909/ouji-icon-fix/02-local-v9.png`
- implementation focused crop: `/Volumes/core/AI-Workspace/Inbox/Legacy-Unattributed-20260909/ouji-icon-fix/04-local-icon-v9-6x.png`
- normalized comparison: `/Volumes/core/AI-Workspace/Inbox/Legacy-Unattributed-20260909/ouji-icon-fix/05-shape-color-comparison.png`
- interaction screenshot: `/Volumes/core/AI-Workspace/Inbox/Legacy-Unattributed-20260909/ouji-icon-fix/06-local-sheet-open-v9.png`
- viewport: in-app browser mobile viewport requested `390 × 844px`, browser capture `375 × 812px`, device scale factor `1`
- state: 首頁底欄關閉狀態；另測「幫我揀」sheet 開啟狀態

## Findings

- **無剩餘 P0／P1／P2。** 舊款 Phosphor `swatches` 輪廓、角度同右下圓晶體構圖保留；獨立 `check-circle` 已完全移除。
- **三色正確。** 三張色卡分別使用低飽和灰粉、霧藍同暖灰褐，唔再係單一粉色，亦冇五顏六色。
- **圓晶體無 tick。** 右下配件改用正式 Phosphor `circle` duotone glyph，保留圓形藍晶體視覺，但內部冇剔號。
- **文字無重疊。** focused crop 顯示圓晶體留喺圖示框內，同「幫我揀」label 有清楚間距。
- **功能正常。** 強制點擊（避免截圖環境動畫遮擋）後 `aria-expanded=true`、`.assist-sheet.is-open=1`；畫面無水平 overflow。
- **Console。** in-app browser 為 `0 error`；有 2 個既有 Meta Pixel currency 格式 warning，與本次圖示改動無關。

## 五個 fidelity surfaces

- **Fonts and typography:** 底欄中文字、字重、行高及 baseline 完全保留；冇文字遮擋。
- **Spacing and layout rhythm:** 五欄位置及底欄高度不變；三色卡維持 24px，圓晶體 11px，光學重量接近購物袋。
- **Colors and visual tokens:** 精確使用上一版三個莫蘭迪色值；晶體用低飽和藍灰 `#7699A3`。
- **Image quality and asset fidelity:** 色卡、圓晶體均來自 Phosphor 正式 icon library glyph；24px 下保持向量銳利，冇 raster halo。
- **Copy and content:** 「幫我揀」、aria label、兩個工具卡及 deep link 全部保留。

## 比較歷史

1. **首輪實作：** 移除 `ph-check-circle`，改用 `ph-circle`；將三個官方 `ph-swatches` glyph 分層套入灰粉、霧藍、暖灰褐。
2. **Post-fix evidence：** DOM 為 `checkMarks=0`、`plainCrystal=1`、`morandiCards=3`；focused comparison 顯示舊款輪廓保留、tick 消失、三色可辨。

## Implementation checklist

- [x] 保留舊款三張扇形色板輪廓
- [x] 保留右下圓晶體，但完全移除 tick
- [x] 套回灰粉、霧藍、暖灰褐三色莫蘭迪 palette
- [x] label 無重疊、無水平 overflow
- [x] assist sheet 互動、aria state、console 檢查

final result: passed

---

# 手機底欄「幫我揀」彩色色卡修正 — Design QA（2026-08-31）

## 測試基準

- source visual truth: `/var/folders/z_/ygspprr92sv_g1p2bhq28fzw0000gn/T/codex-clipboard-3dc6d096-4984-4b11-aa5d-eb221085401e.png`（116 × 122px，用戶指出剔號壓住 label）
- implementation screenshot: `/Volumes/core/Projects/OUJI/Website-and-Design/ouji-nav-color-v5/mobile-v5.png`（390 × 844px）
- focused comparison: `/Volumes/core/Projects/OUJI/Website-and-Design/ouji-nav-color-v5/icon-crop-v5.png`（150 × 95px）
- viewport / CSS size: `390 × 844px`；手機首頁底欄關閉狀態

## Findings

- **無剩餘 P0／P1／P2。** 剔號已完全移除，圖示同「幫我揀」之間重新留出清楚距離，冇再疊字。
- **圖示色彩。** 沿用 Phosphor Duotone `swatches` 正式圖示，底層用柔和珊瑚粉 `#f2a4bb`、前層用湖水藍 `#8fe3ea`；喺 OUJI 藍色底欄有辨識度但唔搶其他入口。
- **功能。** 點擊後 assist sheet 正常開啟，`aria-expanded=true`；browser console 0 error。

## 五個 fidelity surfaces

- **Fonts and typography:** 「幫我揀」字體、字重、行高不變；剔號刪除後 label 完整可讀。
- **Spacing and layout rhythm:** 五欄位置及底欄高度不變；中央圖示維持 `24 × 22px` 光學尺寸，同購物袋同級。
- **Colors and visual tokens:** 珊瑚粉＋湖水藍係 OUJI 美妝語境嘅點綴色，保留原本霧藍玻璃底欄。
- **Image quality and asset fidelity:** 使用正式 icon library 雙色 glyph，冇 handcrafted SVG、CSS art、emoji 或 raster halo。
- **Copy and content:** 「幫我揀」及 aria label 全部保留，功能文案冇改動。

## 比較歷史

1. **P1 — 剔號與 label 疊在一起。** 修正：由 DOM 同 CSS 完整移除 `check-circle`，focused comparison 顯示圖示下方文字冇遮擋。
2. **P2 — 純白圖示唔夠突出。** 修正：以 Phosphor duotone 前後 glyph 分別套用湖水藍及珊瑚粉；post-fix screenshot 顯示雙色清楚可辨。

## Implementation checklist

- [x] 移除 tick DOM、樣式及動畫
- [x] 加入珊瑚粉＋湖水藍雙色
- [x] 390 × 844 手機視覺比較
- [x] 「幫我揀」sheet 互動及 console 檢查

final result: passed

---

# 手機底欄「幫我揀」色卡圖示 — Design QA（2026-08-30）

## 測試基準

- source visual truth: `/Users/winstonli/.codex/generated_images/01a01887-73e8-7d80-894c-16d1590c0d5e/exec-325a8eeb-904b-4e2b-986e-cb53515aa2ef.png`（最近一輪十款中第 4 個顯示結果）
- implementation screenshot: `/Volumes/core/Projects/OUJI/Website-and-Design/ouji-assist-cards/shadecards-local-v1.png`
- full-view comparison: `/Volumes/core/Projects/OUJI/Website-and-Design/ouji-assist-cards/shadecards-full-qa-v1.png`
- focused navigation comparison: `/Volumes/core/Projects/OUJI/Website-and-Design/ouji-assist-cards/shadecards-qa-v1.png`
- viewport / CSS size: `390 × 844px`；device scale factor `1`
- source pixels: `853 × 1844px`，比較前正規化至 `390 × 844px`
- implementation pixels: `390 × 844px`
- state: 首頁手機版，底欄關閉狀態；另測「幫我揀」sheet 開啟狀態

## Findings

- **無剩餘 P0／P1／P2。** 選中方向嘅三張扇形美妝色卡同右下選中記號已清楚落實，水晶球完全移除。
- **指定尺寸差異屬可接受。** ImageGen 樣板把中央圖示誇張到約 32px；實作按此前已定硬性限制維持 `24 × 22px` 視覺框，購物袋為 `22 × 22px`，避免中央入口重新大一截。
- **圖示來源。** 使用 Phosphor Duotone `swatches` 同 `check-circle`，唔係 handcrafted SVG、CSS art、emoji 或文字符號。
- **功能。** 點擊後 dialog 正常顯示，`aria-expanded` 由 `false` 轉成 `true`；頁面水平 overflow 為 `0px`。

## 五個 fidelity surfaces

- **Fonts and typography:** 底欄中文字、字重、行高同原網站完全保留；圖示用 Phosphor-Duotone icon font，實測成功載入。
- **Spacing and layout rhythm:** 五欄位置、label baseline、底欄高度不變；中央圖示 `24 × 22px`，check mark 約 `9.4px`，同購物袋光學重量一致。
- **Colors and visual tokens:** 主色沿用 pearl white；check 用 OUJI 霧藍 `#517c8b` 同淡冰藍 `#dff6fa`，冇加入綠色、水晶色或霓虹科技色。
- **Image quality and asset fidelity:** 選中目標係標準 UI icon；實作使用 Phosphor 正式 icon library，細尺寸保持銳利，冇 raster halo、拉伸或假素材。
- **Copy and content:** 「幫我揀」文字、aria label、兩張功能卡同 deep link 全部保留。

## 比較歷史

1. **首輪比較：** full-view 同 focused navigation composite 均已檢視。樣板中央 icon 較大，但與此前「以購物袋為尺寸基準」決定衝突；實作維持同級尺寸，列為 intentional constraint，無需修正。
2. **互動驗證：** sheet 可開啟，`aria-expanded=true`，browser console `0 error / 0 warning`。

## Implementation checklist

- [x] 水晶球及相關折射動畫完全移除
- [x] 三張美妝色卡＋選中記號
- [x] 使用正式 icon library
- [x] 390 × 844 responsive、無水平 overflow
- [x] 幫我揀 dialog 開啟及 accessibility state
- [x] full-view 及 focused visual comparison

final result: passed

---

# 手機底欄「幫我揀」四色美妝色卡 — Design QA（2026-08-31）

## 測試基準

- source visual truth: `/Users/winstonli/.codex/generated_images/01a01887-73e8-7d80-894c-16d1590c0d5e/exec-325a8eeb-904b-4e2b-986e-cb53515aa2ef.png`（原本第 4 款扇形色卡構圖）
- user correction reference: `/var/folders/z_/ygspprr92sv_g1p2bhq28fzw0000gn/T/codex-clipboard-3dc6d096-4984-4b11-aa5d-eb221085401e.png`（移除壓住 label 嘅 tick）
- implementation screenshot: `/Volumes/core/Projects/OUJI/Website-and-Design/ouji-nav-multicolor-v6/mobile-v6.png`（390 × 844px）
- focused comparison: `/Volumes/core/Projects/OUJI/Website-and-Design/ouji-nav-multicolor-v6/icon-crop-v6.png`（150 × 95px）
- viewport / CSS size: `390 × 844px`；手機首頁底欄關閉狀態

## Findings

- **無剩餘 P0／P1／P2。** 新圖示清楚呈現珊瑚粉、蜜桃橙、薰衣草紫同湖水藍四種顏色，唔再係藍色加另一隻色。
- **構圖。** 保留原本多張美妝色卡交疊／扇開嘅意念；移除 tick 後文字完整可讀。
- **圖示來源。** 使用 Streamline Color `color-swatches` 正式 icon asset，再按 OUJI 美妝色盤調色；並保留 CC BY 4.0 來源註記。
- **功能。** assist sheet 正常開啟，`aria-expanded=true`，browser console 0 error。

## 五個 fidelity surfaces

- **Fonts and typography:** 「幫我揀」label 字體、字重、行高不變，冇遮擋或額外換行。
- **Spacing and layout rhythm:** 五欄底欄及 label baseline 不變；圖示渲染框 `24 × 26px`，光學重量同購物袋接近。
- **Colors and visual tokens:** 四隻美妝色分配到唔同色卡面，喺霧藍底欄保持對比，亦呼應 OUJI 彩妝商品色盤。
- **Image quality and asset fidelity:** 使用正式 icon library vector asset，24px 顯示仍然銳利，冇 raster halo、CSS art、emoji 或 placeholder。
- **Copy and content:** 導覽名稱、aria label、sheet 文案及 deep links 全部保持不變。

## 比較歷史

1. **P2 — 雙色版本未符合「彩色」。** 修正：由 Phosphor 雙色 glyph 改成四種獨立美妝色嘅 Streamline Color 色卡 asset。
2. **P1 — 舊 tick 疊住 label。** 維持移除狀態；post-fix focused crop 確認圖示同文字之間冇重疊。

## Implementation checklist

- [x] 四種顏色分佈喺不同色卡面
- [x] 無 tick、無疊字
- [x] 390 × 844 full-view 及 focused comparison
- [x] assist sheet、accessibility state、console 檢查

final result: passed

---

# 手機底欄「幫我揀」三色莫蘭迪色卡 — Design QA（2026-08-31）

## 測試基準

- source visual truth: `/Users/winstonli/.codex/generated_images/01a01887-73e8-7d80-894c-16d1590c0d5e/exec-325a8eeb-904b-4e2b-986e-cb53515aa2ef.png`（原本第 4 款三張色卡構圖）
- previous bright-color reference: `/Volumes/core/Projects/OUJI/Website-and-Design/ouji-nav-multicolor-v6/icon-crop-v6.png`
- implementation screenshot: `/Volumes/core/Projects/OUJI/Website-and-Design/ouji-nav-morandi-v7/mobile-v7.png`（375 × 812px）
- focused comparison: `/Volumes/core/Projects/OUJI/Website-and-Design/ouji-nav-morandi-v7/icon-crop-v7.png`（150 × 95px）
- state: 手機首頁底欄關閉狀態；另測 assist sheet 開啟狀態

## Findings

- **無剩餘 P0／P1／P2。** 三張色卡只使用霧藍灰 `#8AAEB8`、灰粉紅 `#B89AA1`、暖灰褐 `#B4AA98` 三隻主色，飽和度明顯低過上一版。
- **品牌一致性。** 霧藍灰承接網站 `--primary` 藍色系；粉紅同灰褐只作低調美妝提示，整體同半透明藍玻璃底欄融合。
- **功能。** tick 維持移除；assist sheet 正常開啟，`aria-expanded=true`；browser console 0 error。

## 五個 fidelity surfaces

- **Fonts and typography:** label 字體、字重、行高不變，圖示同「幫我揀」冇重疊。
- **Spacing and layout rhythm:** 五欄位置不變；圖示維持 `24 × 26px` 渲染框，冇令底欄增高。
- **Colors and visual tokens:** 三色均屬低飽和莫蘭迪色，冇橙、鮮粉或高亮紫；同 OUJI `#6da3b5` 主藍屬近似灰調。
- **Image quality and asset fidelity:** 保留 Streamline Color 正式 icon asset 三張交疊色卡結構，細尺寸保持清晰。
- **Copy and content:** 導覽名稱、aria label、sheet 內容及連結全部保留。

## 比較歷史

1. **P2 — 四隻糖果色過於艷麗。** 修正：收窄至三張色卡／三隻低飽和色，移除鮮橙及鮮紫，並將前後色卡統一成霧藍灰、灰粉紅、暖灰褐。
2. **Post-fix evidence：** focused crop 顯示三色清楚但沉穩；full-view 顯示圖示融入霧藍底欄，冇搶過 OUJI 主導航。

## Implementation checklist

- [x] 三張色卡只用三隻主色
- [x] 莫蘭迪低飽和處理
- [x] 無 tick、無疊字
- [x] full-view、focused comparison、互動及 console 檢查

final result: passed

---

# 手機底欄「幫我揀」原版構圖彩色化 — Design QA（2026-08-31）

## 測試基準

- source visual truth: `/var/folders/z_/ygspprr92sv_g1p2bhq28fzw0000gn/T/codex-clipboard-3dc9690c-455c-444b-9dbf-470e37846187.png`（116 × 100px，指定原本三張扇形色板＋右下圓晶體）
- implementation screenshot: `/Volumes/core/Projects/OUJI/Website-and-Design/ouji-nav-original-color-v8/mobile-v8-final.png`（375 × 812px）
- focused comparison: `/Volumes/core/Projects/OUJI/Website-and-Design/ouji-nav-original-color-v8/icon-crop-v8-final.png`（150 × 95px）
- state: 手機首頁底欄關閉狀態；另測 assist sheet 開啟狀態

## Findings

- **無剩餘 P0／P1／P2。** 原本 Phosphor 三張扇形色板同右下圓晶體構圖已完整恢復；唔再使用上一版 Streamline 方角色卡輪廓。
- **唯一視覺改動。** 色板由白色改成低飽和灰粉 `#D4B9C0`；圓晶體保留霧藍 `#6F929D`，角度、大小同重疊方向跟來源。
- **疊字修正。** 圓晶體仍在右下，但收返入圖示框，`bottom: 0`，同「幫我揀」label 之間保持空位。
- **功能。** assist sheet 正常開啟，`aria-expanded=true`；browser console 0 error。

## 五個 fidelity surfaces

- **Fonts and typography:** label 字體、字重、行高保持不變，冇重疊。
- **Spacing and layout rhythm:** 三張扇形色板 `24px`，圓晶體 `10px`；構圖比例同來源一致，底欄高度不變。
- **Colors and visual tokens:** 灰粉色低飽和、霧藍晶體沿用 OUJI 色系；冇重新加入五顏六色。
- **Image quality and asset fidelity:** 使用原本 Phosphor `swatches`＋`check-circle` 正式 icon library glyph，唔係自畫近似形狀。
- **Copy and content:** 「幫我揀」、aria label、sheet 文案及連結全部保留。

## 比較歷史

1. **P1 — 上一版改變咗 logo 輪廓。** 修正：完整撤回 Streamline 色卡，恢復原本 Phosphor 三張扇形色板＋右下圓晶體。
2. **P2 — 第一輪灰粉色過暗。** 修正：由 `#C7ADB3` 提升至 `#D4B9C0`，保留莫蘭迪灰調同時改善 24px 可見度。
3. **Post-fix evidence：** focused comparison 顯示輪廓、角度、圓晶體位置同來源一致；文字冇遮擋。

## Implementation checklist

- [x] 恢復原版三張扇形色板
- [x] 恢復右下藍色圓晶體
- [x] 唯一造型差異只係加入莫蘭迪灰粉色
- [x] 無疊字、互動正常、console 0 error

final result: passed

---

# 手機底欄「幫我揀」晶體歸位及色板填色 — Design QA（2026-08-31）

## 測試基準

- source visual truth: `/var/folders/z_/ygspprr92sv_g1p2bhq28fzw0000gn/T/codex-clipboard-433945db-bb78-46ce-bb59-b8b1d3627fa1.png`（指定粉色扇形色板＋右下圓晶體）
- implementation screenshot: `/Volumes/core/AI-Workspace/Inbox/Legacy-Unattributed-20260909/ouji-icon-fill-fix/06-local-filled-crystal-v11.png`（390 × 844px）
- focused comparison: `/Volumes/core/AI-Workspace/Inbox/Legacy-Unattributed-20260909/ouji-icon-fill-fix/08-source-vs-v11.png`（來源／修正後並排）
- state: 手機首頁底欄關閉狀態；另測 assist sheet 開啟狀態

## Findings

- **無剩餘 P0／P1／P2。** 圓晶體已定位於色板 logo 右下方，晶體上下界完整落在 `24 × 22px` logo 框內，唔再落入「幫我揀」文字區。
- **實色填滿。** 三層色板使用 Phosphor fill glyph，分別填入莫蘭迪灰粉、霧藍、暖灰褐；保留原本白色輪廓。
- **移除 tick。** DOM 內 `ph-check-circle` 數量為 0；晶體只由 `ph-circle` fill＋duotone ring 組成。
- **功能。** assist sheet 正常開啟，`aria-expanded=true`、`.assist-sheet.is-open=1`；local console 0 error／warning，production 0 error（只有既有 Meta Pixel currency format warning，與本改動無關）。

## 五個 fidelity surfaces

- **Fonts and typography:** 「幫我揀」label 字體、字重及行高不變，晶體同文字之間無重疊。
- **Spacing and layout rhythm:** 晶體以 `top: 8px` 明確錨定 logo 內，實測晶體 bottom 比 logo bottom 少 1px。
- **Colors and visual tokens:** 使用低飽和莫蘭迪灰粉 `#B89AA1`、霧藍 `#8AAEB8`、暖灰褐 `#B4AA98`；晶體沿用 OUJI 藍灰 `#7699A3`。
- **Image quality and asset fidelity:** 使用官方 Phosphor `swatches`／`circle` glyph；13px 晶體有填色及淺色外圈，細尺寸仍可辨識。
- **Copy and content:** 導覽名稱、aria label、sheet 文案及連結完全保留。

## 比較歷史

1. **P1 — 晶體被視覺上拆落文字區。** 修正：不用會分離 pseudo-element 的單一 duotone 佈局，改為同位疊放 fill＋ring，並以 `top` 錨定於 logo。
2. **P1 — 色板中間鏤空。** 修正：三層色板改用 `ph-fill ph-swatches`，再獨立疊加輪廓。
3. **Post-fix evidence：** source／implementation 並排確認晶體位置同原圖一致；唯一刪除元素為文字上方多餘 tick。

## Implementation checklist

- [x] 晶體放在 logo 右下方，而非文字位置
- [x] 三層色板有實色填滿
- [x] 無 tick、無疊字
- [x] assist sheet、DOM、console 及 mobile viewport 檢查

final result: passed

---

# 手機底欄「幫我揀」Option A 獨立三色卡 — Design QA（2026-08-31）

## 測試基準

- approved sample: `http://127.0.0.1:8771/?v=3`（A：有藍色透明晶體）
- implementation: 手機首頁 `390 × 844px`，底欄關閉狀態；另測 assist sheet 開啟狀態
- visual target: 三個色卡面各自獨立填色，晶體保持可見但唔遮住主要色卡

## Findings

- **無剩餘 P0／P1／P2。** 三個色卡面已由三個獨立 SVG mask 呈現，唔再用三層完整 glyph 互相覆蓋。
- **三色分明。** 灰粉 `#C39DA8`、鼠尾草綠 `#8F9C87`、暖灰褐 `#C0B195`；色卡唔再使用同背景相近嘅藍色。
- **晶體可見。** 藍色透明晶體使用 `11 × 11px`、88% fill opacity、淺色外圈，完整留在 logo 垂直範圍內。
- **功能正常。** `ph-check-circle=0`、assist sheet `aria-expanded=true`、`.assist-sheet.is-open=1`；local console 0 error／warning。

## 五個 fidelity surfaces

- **Fonts and typography:** 「幫我揀」label 字體、字重、行高及位置不變。
- **Spacing and layout rhythm:** logo 容器維持 `24 × 22px`；晶體縮至 sample 比例並向右移，減少遮擋第三色卡。
- **Colors and visual tokens:** 藍色只留畀底欄背景及晶體；三個色卡均為低飽和莫蘭迪色。
- **Image quality and asset fidelity:** 三個 mask 直接取自正式 Phosphor swatches glyph 內三個官方 card face path，輪廓沿用 Phosphor duotone icon。
- **Copy and content:** 導覽名稱、aria label、sheet 文案與連結全部保留。

## Implementation checklist

- [x] 採用用戶選定 Option A
- [x] 三個色卡面獨立填色，無互相覆蓋
- [x] 無藍色色卡、無 tick
- [x] 晶體清楚可見、assist sheet 正常、console 0 error

final result: passed

---

# 手機底欄「幫我揀」Exact SVG 上架 — Design QA（2026-08-31）

## 測試基準

- approved exact sample: `/Volumes/core/Projects/OUJI/Website-and-Design/ouji-logo-samples-v12/ouji-shade-option-a-exact.svg`
- live candidate asset: `assets/icons/ouji-shade-option-a.svg`
- implementation: 手機首頁 `390 × 844px`；圖示實際渲染 `24 × 22px`

## Findings

- **單一視覺真相。** sample 與網站資產 SHA-256 同為 `b8b54b66f202dcd0601cd2c2ca6fa83e86ee0f8789c540f46c90a415b45f4c3d`。
- **無重組。** live markup 只載入一個 `<img src="/assets/icons/ouji-shade-option-a.svg">`；舊 card／crystal／outline 分層 DOM 數量為 0。
- **尺寸與功能。** SVG 成功以 HTTP 200 載入並渲染為 `24 × 22px`；assist sheet `aria-expanded=true`、`.assist-sheet.is-open=1`。
- **Console。** local console 0 error／warning。

## Implementation checklist

- [x] sample 與網站使用完全相同 SVG bytes
- [x] 移除三個獨立 mask 與 icon-font 晶體重組
- [x] 保留既有底欄尺寸、標籤與互動
- [x] checksum、mobile viewport、resource、interaction、console 驗證

final result: passed
