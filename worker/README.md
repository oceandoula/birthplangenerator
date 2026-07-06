# WAVE Email Worker

Cloudflare Worker，負責把用戶的計畫書透過 [SendGrid](https://sendgrid.com) 寄成一封漂亮的 HTML 信，
可選擇附上視覺版 PDF。前端（`index.html`）的 `emailMyPlan()` 會呼叫這個 Worker。

> 為什麼用 SendGrid 而不是 Resend？因為 oceandoula.com 的 DNS 由 Wix 管理，
> Wix 不支援子網域 MX 記錄，無法完成 Resend 的網域驗證。
> SendGrid 驗證只需要 CNAME 記錄，Wix 支援。

## 一次性設定

### 1. SendGrid 帳號 + 驗證網域
1. 到 https://signup.sendgrid.com 註冊（免費方案每天 100 封，不用信用卡）。
2. 左側 **Settings → Sender Authentication → Authenticate Your Domain**
   - DNS host 選 **Other Host**，Domain 填 `oceandoula.com`
   - 「Would you also like to brand the links?」選 No 即可
3. SendGrid 會給 **3 筆 CNAME 記錄**（長得像 `em1234`、`s1._domainkey`、`s2._domainkey`）。
4. 到 **Wix → Domains → Manage DNS Records**，在 CNAME 區各加一筆：
   - Host name 填 SendGrid 給的 Name（Wix 會自動補 `.oceandoula.com`，不用重打）
   - Value 填 SendGrid 給的 Value
5. 回 SendGrid 按 **Verify**（DNS 生效約 5–30 分鐘）。
6. **Settings → API Keys → Create API Key**
   - Name: `wave-email`，權限選 **Restricted Access**，只開 **Mail Send: Full Access**
   - 複製 key（`SG.xxxx...`，只顯示一次）

### 2. 部署 Worker
需要 Node.js。在這個 `worker/` 資料夾裡執行：

```bash
cd worker
npx wrangler login                        # 第一次會開瀏覽器授權 Cloudflare
npx wrangler secret put SENDGRID_API_KEY  # 貼上剛剛 SendGrid 的 API key
npx wrangler deploy
```

部署成功後會印出 Worker 網址，長得像：

```
https://wave-email.<你的子網域>.workers.dev
```

### 3. 把網址接回前端
打開專案根目錄的 `index.html`，找到：

```js
const EMAIL_WORKER_URL = 'https://wave-email.YOUR-SUBDOMAIN.workers.dev';
```

換成上一步拿到的實際網址，commit + push（GitHub Pages 約 1 分鐘生效）。

## 設定值（`wrangler.toml` 的 `[vars]`）
| 變數 | 說明 |
|------|------|
| `FROM_EMAIL` | 寄件人 email，網域需在 SendGrid 完成 Domain Authentication。例：`plans@oceandoula.com` |
| `FROM_NAME` | 寄件人顯示名稱。例：`WAVE Support` |
| `REPLY_TO` | 選填，用戶回信時的收件信箱 |
| `ALLOWED_ORIGIN` | 允許呼叫的來源，正式站是 `https://oceandoula.github.io`。本機測試可暫時改成 `*` |
| `SENDGRID_API_KEY` | **secret，不要寫進檔案**，用 `wrangler secret put` 設定 |

改完 `wrangler.toml` 後要重新 `npx wrangler deploy` 才會生效。

## 前端送出的 payload
`POST` JSON：

```json
{
  "name": "小美",
  "email": "user@example.com",
  "planHtml": "<p>…段落式計畫書…</p>",
  "pdfBase64": "JVBERi0x…",   // 選填，視覺版已解鎖時才有
  "lang": "zh"                  // "zh" 或 "en"
}
```

回傳 `{ "ok": true }` 代表已交給 SendGrid 寄出。

## 本機測試
```bash
npx wrangler dev
```
會在 `http://localhost:8787` 起一個本機版；記得把 `ALLOWED_ORIGIN` 暫時設成 `*`
並把前端的 `EMAIL_WORKER_URL` 指到本機網址測試。

## 費用
- Cloudflare Workers 免費方案：每天 10 萬次請求，對 Beta 綽綽有餘。
- SendGrid 免費方案：每天 100 封。超過再升級。
