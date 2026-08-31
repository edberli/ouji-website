# OUJI 三個產品頁品牌輪播 — Design QA

## 測試基準

- source visual truth: `/Volumes/core/ouji-brand-section-exact/source-exact-user.png`
- production assets: repo `assets/brand-carousel/`（11 張、2151/2152 × 731 WebP）；原始 PNG 保留於 `/Volumes/core/ouji-brand-carousel/assets/`
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

# 手機底欄「幫我揀」彩色色卡修正 — Design QA（2026-08-31）

## 測試基準

- source visual truth: `/var/folders/z_/ygspprr92sv_g1p2bhq28fzw0000gn/T/codex-clipboard-3dc6d096-4984-4b11-aa5d-eb221085401e.png`（116 × 122px，用戶指出剔號壓住 label）
- implementation screenshot: `/Volumes/core/ouji-nav-color-v5/mobile-v5.png`（390 × 844px）
- focused comparison: `/Volumes/core/ouji-nav-color-v5/icon-crop-v5.png`（150 × 95px）
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
- implementation screenshot: `/Volumes/core/ouji-assist-cards/shadecards-local-v1.png`
- full-view comparison: `/Volumes/core/ouji-assist-cards/shadecards-full-qa-v1.png`
- focused navigation comparison: `/Volumes/core/ouji-assist-cards/shadecards-qa-v1.png`
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
- implementation screenshot: `/Volumes/core/ouji-nav-multicolor-v6/mobile-v6.png`（390 × 844px）
- focused comparison: `/Volumes/core/ouji-nav-multicolor-v6/icon-crop-v6.png`（150 × 95px）
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
