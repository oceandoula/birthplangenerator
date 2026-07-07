# WAVE Support — Claude Code 專案說明

## 專案概述
**WAVE Support** 是 Ocean Doula（oceandoula.com）的 AI 互動式生產計畫書產生器。
- **定位**：台灣第一個 AI 互動式生產計畫書產生器（Beta）
- **工具網址**：https://oceandoula.github.io/birthplangenerator/
- **GitHub Repo**：oceandoula/birthplangenerator（公開 repo，不要放任何機密或私人信箱）
- **主要檔案**：`index.html`（單一檔案，所有前端功能都在裡面）
- **Email Worker**：`worker/`（Cloudflare Worker + SendGrid，見 worker/README.md）
- **Owner**：Naphy（Ocean Doula 創辦人，在澳洲伯斯）
  - 業務信箱：naphy@oceandoula.com（不是 hello@；私人 gmail 不要進 repo）

---

## 技術架構
- **前端**：純 HTML + CSS + JS，無框架
- **部署**：GitHub Pages（push 後約 1 分鐘生效；**CDN 快取很兇，驗證要加 `?v=N` 破快取**）
- **字體**：Noto Serif TC + Noto Sans TC（Google Fonts）
- **付款**：Stripe（隨心定價 minimum $3，建議 $9）
- **Email 訂閱**：Kit/ConvertKit 公開表單端點（form 9634406，`submitGate()` fire-and-forget）
- **寄計畫書**：Cloudflare Worker `https://wave-email.oceandoula.workers.dev` + SendGrid
  - 為什麼不是 Resend：Wix DNS 不支援子網域 MX，Resend 驗證不了
  - 部署：`cd worker && npx wrangler deploy`；secret：`npx wrangler secret put SENDGRID_API_KEY`
- **計畫書記錄**：每封信 BCC 到 naphy@oceandoula.com + 寫入 Cloudflare D1（`wave-plans`，
  table `plans`：id/created_at/name/email/lang/plan_html/attachments）
- **回饋**：Google Forms（image ping）。中英文表單的星星題 entry 相同：`entry.785284528`
- **狀態儲存**：localStorage（`wave_birth_plan_v1`；含 unlocked、autoEmailSent、visualTheme）

---

## 功能清單

### ✅ 已完成
- 完整問卷（9 大類別，70+ 選項）、Wizard/全覽模式、鍵盤導航
- 中英文切換（含視覺計畫書 SVG、icon 標籤、定價卡、解鎖區全翻譯）
- `xlateAnswer()`：已存答案自動翻成目前語言（文字版、視覺版、builder 摘要都套用；
  中英選項清單已 1:1 對齊。**新增/修改選項時兩邊要同步同順序**，
  不然安全鎖會讓該題不翻譯。勾選比較用 `sameAnswer()` 跨語言對照）
- AI 文字計畫書（模板生成，免費）
- 視覺計畫書（A4 橫向，每排 8 卡，section bar merge，第一頁填滿再分頁）
- **83 個實心 AAC 風 icon**（2026-07 全面重繪；有色線條最小 3.2、否定=coral 圈斜線）
- **配色主題切換**：原本配色 / 美人魚配色（粉彩漸層，預設美人魚；含 header/footer）
- **自動寄信**：生成計畫書即寄 email（每人一次 `autoEmailSent`），信含五星評論連結（預填分數）
- 手動「寄到我的信箱」按鈕；解鎖後附 PDF+PNG 附件（`buildVisualAttachments` 擋 `state.unlocked`）
- 解鎖碼系統、星星評分、localStorage 自動儲存、PNG/PDF 下載（檔名雙語）

### 🔑 解鎖碼清單
```javascript
'WAVE2026': 'basic', 'OCEAN0726': 'basic',
'WAVE2027': 'basic', 'OCEAN1026': 'basic',
'WAVEPLUS': 'pro', 'OCEAN97': 'pro',
'NAPHY001'~'NAPHY010': 'pro',
'WAVEBETA': 'pro', 'OCEANTEAM': 'pro',
'WAVEFREE': 'pro',        // 通用測試碼
'WAVEFREE01'~'WAVEFREE05': 'pro'  // 個人測試碼
```

---

## 視覺計畫書排版邏輯（重要！）

### 分頁
- `renderPages()` → cards 排成 rows → 按 row 高度分頁
- 第一頁可用高度 = `PH - HEADER_H - PHIL_H - FOOTER_H - 24 - textRowsH`
- 短答題高度由 `calcTextRows()` 計算——**顯示（buildPage）與分頁共用同一函式**，改一邊必壞另一邊

### 卡片
- 每排 8 個（`COLS = 8`），section bar merge 橫跨所屬卡片
- icon：平面圓底 r=18（泡泡光影已移除）+ `getIcon(label, cx, cy, 30)`；
  **兩種配色的圓底都用近白 `rgba(255,255,255,0.92)`**（icon 配同色系圓底會糊，白底對比最好）
- **`getIcon()` 會自動置中+統一大小**：用隱藏 SVG `getBBox()` 實測邊界框（快取
  `window._ICON_BBOX`），新 icon 不用精準置中，畫在 56 box 內即可
- 文字：標籤 11px 粗體（`wrapCardLabel` 最多兩行）、note 8.5px（`wrapText` 最多兩行，
  中文在標點斷行、開括號跟下一行，**絕不硬砍字**）

### 短答題（text 類型）
- 顯示在生產理念下方白框；名稱寬度用 `estTextW` 實測（曾因 6px/字估錯造成重疊，孕婦回報過）
- 值太長自動折兩行，列高動態

### 美人魚配色
- `state.visualTheme`（'original'|'mermaid'），`MERMAID_MAP` 把實色換成同色系漸層
- 漸層必須 `userSpaceOnUse`（否則純直線 bbox=0 會消失）
- teal 的美人魚版是 baby blue（#5FB0D8→#8FD3EC）；綠→粉這種跨色相漸層會濁，Naphy 否決過

---

## 定價策略
| 方案 | 價格 | 說明 |
|------|------|------|
| 文字版 | 免費（Launch 期間限時） | AI 生成段落式計畫書 |
| 視覺圖卡 | 隨心定價，建議 $9 USD，最低 $3 | 優惠至 2026/8/31，之後 $19 |
| 視覺 + 諮詢 | $97 USD | 含 Naphy 60 分鐘一對一 |

### Payment Links
- 隨心定價（視覺版）：`https://dub.sh/wavebirthplan`
- $97 諮詢：`https://buy.stripe.com/6oU14g99gec37u8dpBgMw04`

---

## Google Forms
- 中文版 Form ID：`1FAIpQLSfXL5ktgF0fTI38a63bakLJAIcF_Z9L6yXU4jUs9vMfzwXQnA`
- 英文版 Form ID：`1FAIpQLSecFLWo4F89NUffi5nmer6nEYO65x16HBbtI8tP54MYiKfxVg`
- 星星評分 entry：`entry.785284528`（兩份表單相同，已驗證）

---

## 文案核心
**Hero**：「我怕痛、怕被剪、怕剖腹。」妳說出口了嗎？

**痛點三張卡**：
- 😰 怕痛 → 非藥物減痛、笑氣、硬脊膜外⋯
- ✂️ 怕剪 → WHO 建議低於 10%，妳在行使知情同意的權利
- 🤍 怕剖腹 → 說出來才有對話可能

**遺憾文案**：
「假如當年我有開口要求，會不會不一樣⋯⋯」
不要多年後回想，才後悔自己沒說出口。
說了沒用？也許。但沒說，一定沒用。
同樣的產房、同樣的醫護——說出口的媽媽，和沒說的媽媽，經歷的往往是兩種故事。

---

## Wix 頁面架構（oceandoula.com）

### Home 頁嵌入
- `wave-home-block.html` — 深色漸層區塊，含波浪過渡，右側計畫書截圖
- `wave-floating-btn.html` — 漂浮按鈕（固定左下角）

### WAVE 專頁（/wave）
- `wave-s1-hero.html` ~ `wave-s9-finalcta.html`（Hero/痛點/三步驟/mockup/功能/滾動卡/定價/FAQ/CTA）

---

## 待辦事項
- [ ] 隱私聲明：gate 的「不寄垃圾訊息」補一句「計畫書會安全保存」（已開始 BCC+D1 存內容）
- [ ] 「🔄 重新開始」按鈕（清 localStorage 重填；二胎/共用裝置需要）
- [ ] Mockup 截圖更新：工具本身的「下載 PNG」就是最新素材，拿去換 Wix 各區塊
- [ ] 收集 Beta feedback，繼續逐顆修 icon（Naphy 點名制）

## 已完成的大項（2026-07）
- ✅ Email 功能（自動寄文字版+評論邀請；解鎖附 PDF/PNG）
- ✅ Icon 可讀性（83 顆全部實心 AAC 風重繪）
- ✅ 英文模式全面修復（setLang 曾因 .btn-unlock 不存在而 crash，整段翻譯沒跑）
- ✅ 短答題重疊 bug（名稱寬度估錯）

---

## 重要注意事項
1. **Token/API key 用完記得 revoke**；SendGrid key 用 `wrangler secret put`，絕不進檔案
2. JS 函式定義順序很重要（`setLang` 要在 CATEGORIES 定義後）
3. 視覺計畫書 SVG 超過 48KB 會讓 Wix timeout，不要直接嵌入大 SVG
4. Page split 按 row 計算高度；短答題高度走 `calcTextRows()`，兩處共用
5. **彎引號 `'` 在 Noto Sans TC 會變全形寬**（"We' ve" 那種怪縫），英文文案用直引號或改寫
6. **驗證線上版一定加 `?v=N`**；無痕的 localStorage 在所有無痕視窗間共用，要全關才乾淨
7. `icon-review.html` 是本機 icon 檢查頁（已 .gitignore），瀏覽器開
   `http://localhost:PORT/icon-review.html` 可對照原本/美人魚兩版全部 icon
8. Worker 改動要另外 `npx wrangler deploy`，跟 GitHub Pages 是兩條部署線
9. lookbehind regex 等新語法別用——單檔架構一個語法錯誤會讓整站白屏（舊 iOS Safari）
