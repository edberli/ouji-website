# OUJI 全部產品頁品牌區 — Design QA

## 測試基準

- source visual truth: `/Volumes/core/ouji-brand-section-mockups/brand-section-03.png`
- implementation evidence (desktop): `/Volumes/core/ouji-brand-section-mockups/implementation-desktop-section-final.png`
- implementation evidence (mobile): `/Volumes/core/ouji-brand-section-mockups/implementation-mobile-final.png`
- full-view comparison: `/Volumes/core/ouji-brand-section-mockups/comparison-desktop-final.png`
- focused comparison: `/Volumes/core/ouji-brand-section-mockups/comparison-focused-final.png`
- desktop viewport: 1271 × 1238 CSS px；瀏覽器截圖輸出 1280 × 720（CSS scale，聚焦品牌區）
- mobile viewport: iframe 390 × 650 CSS px；外層瀏覽器截圖 1280 × 720（CSS scale）
- source pixel dimensions: 1271 × 1238；source CSS size: 1271 × 1238；density normalization: 1×
- state: 首次載入、無品牌篩選；另測試 `?brand=Anua` 篩選狀態

## 五個 fidelity surfaces

- **Content:** Round Lab 焦點卡、8 個熱門品牌、全部品牌入口、產品數量 CTA 齊全；品牌產品數使用即時 catalog 值 53，而非設計稿示意值 61。
- **Geometry:** 桌面維持左焦點卡／右 4×2 品牌矩陣，促銷橫幅緊接其下；手機版改為上下堆疊，兩行品牌卡可橫向捲動。
- **Styling:** 沿用第 3 款柔和粉彩卡面、圓角、低對比背景及 OUJI 藍色重點；所有 logo 保留原色，並以既有品牌／產品圖作淡背景。
- **State:** hover、keyboard focus、品牌篩選、全部品牌連結及 responsive overflow 均有對應狀態。
- **Behavior:** 點選 Anua 後網址變成 `shop.html?brand=Anua`，抽查首 12 張產品卡品牌全部為 Anua；瀏覽器 console 無 error 或 warning。

## QA 迭代紀錄

1. **P1 — 品牌背景圖溢出卡片:** 初版圖片因定位容器缺失而擴展至整頁，造成頁面泛白及超大圖片範圍。加入 `position: relative` 與 `isolation: isolate` 後，背景圖被限制於每張 150 × 130 px 卡片內；桌面重拍通過。
2. **P2 — 品牌卡過於平面:** 初版只有純色 logo 卡，與設計稿的產品質感有落差。改為重用網站既有品牌／產品圖片，14% 透明度疊在粉彩底色上；聚焦比較通過。

## Responsive 與可用性

- 390 px 寬度下，焦點卡與熱門品牌區正確堆疊。
- 8 張品牌卡最小高度 88 px；橫向容器 `clientWidth=338`、`scrollWidth=596`，可水平瀏覽而不壓縮 logo。
- `prefers-reduced-motion` 下移除過場動畫。
- 品牌連結使用實際 `<a>` 元素並提供清楚 focus-visible 樣式。

## 可接受差異

- **P3 — 每卡圓形箭嘴:** 設計稿有細小圓箭嘴；實作以整張卡可點擊、hover 抬升及 focus ring 取代，資訊與操作仍清楚。
- **P3 — 背景素材:** 設計稿的有機紋理是生成示意；正式實作按用戶要求只重用現有品牌頁／catalog 圖檔，因此卡面細節不會逐像素一致。
- **P3 — 頁頂 hero:** 現行網站 hero 已更新，與生成 mockup 的舊 hero 不同；本次 scope 只包括品牌 section，未回退既有 hero。

final result: passed
