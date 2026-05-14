# 售票系統

小演唱會線上預售票系統，購票後自動記錄到 Google Sheets，並產生電子票券圖片供下載。

---

## 功能

- 活動資訊展示（自動從 Google Sheet 標題讀取演出名稱）
- 倒數計時器（開賣前顯示）
- 票券餘量即時顯示
- 購票表單（姓名、手機、Email、票種、數量）
- 訂單自動寫入 Google Sheets
- 電子票券圖片（含 QR Code）可下載

---

## 快速開始

### 1. 安裝依賴

```bash
cd ticketing-system
npm install
```

### 2. 設定 Google Sheets API

**2-1. 建立 Google Cloud 專案**

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 新增專案（或使用現有專案）
3. 側選單 → **API 和服務** → **啟用 API 和服務**
4. 搜尋 `Google Sheets API` → 啟用

**2-2. 建立服務帳戶**

1. 側選單 → **API 和服務** → **憑證**
2. 點選 **建立憑證** → **服務帳戶**
3. 填寫名稱後建立
4. 進入剛建立的服務帳戶 → **金鑰** 標籤 → **新增金鑰** → JSON
5. 下載的 JSON 檔案重新命名為 `credentials.json`，放在專案根目錄

**2-3. 分享試算表給服務帳戶**

1. 開啟你的 Google Sheet：
   `https://docs.google.com/spreadsheets/d/1goCr4CLzNtVaHr9Z2w4YDfT5-oG3AUjgtLG3KJvyCYc/`
2. 右上角 **共用**
3. 加入服務帳戶的 email（格式類似 `xxx@your-project.iam.gserviceaccount.com`）
4. 權限設為 **編輯者**

### 3. 設定環境變數

```bash
cp .env.example .env
```

編輯 `.env`，填入付款資訊：

```env
PORT=3000
SPREADSHEET_ID=1goCr4CLzNtVaHr9Z2w4YDfT5-oG3AUjgtLG3KJvyCYc
GOOGLE_CREDENTIALS_FILE=credentials.json

PAYMENT_METHOD=銀行轉帳
PAYMENT_BANK=玉山銀行
PAYMENT_BRANCH=信義分行
PAYMENT_ACCOUNT_NAME=你的姓名
PAYMENT_ACCOUNT_NUMBER=0000000000000
PAYMENT_NOTE=轉帳時請備註訂單編號，完成後截圖傳給主辦確認
```

### 4. 啟動

```bash
# 開發模式（自動重啟）
npm run dev

# 正式模式
npm start
```

打開 `http://localhost:3000`

---

## Google Sheets 欄位說明

訂單會自動寫入以下欄位：

| 欄位 | 說明 |
|------|------|
| 時間戳 | 下單時間（台北時間） |
| 訂單編號 | VB20260519-XXXX 格式 |
| 姓名 | 購票人姓名 |
| 手機 | 購票人手機 |
| Email | 購票人 Email |
| 票種 | 選擇的票種名稱 |
| 數量 | 購買數量 |
| 金額 | 應付總金額 |
| 付款狀態 | 初始為「待確認」，付款後手動改為「已確認」 |
| 備註 | 購票人備註 |

> 收到付款後，在 Google Sheets 中將「付款狀態」欄位改為「已確認」即可。

---

## 部署到 Server

### 方式 A：VPS（推薦用 PM2）

```bash
npm install -g pm2
pm2 start server.js --name vibes-tickets
pm2 save
pm2 startup
```

設定 Nginx 反向代理：
```nginx
server {
    listen 80;
    server_name your-domain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 方式 B：Railway / Render 等 PaaS

將 `credentials.json` 的內容貼入環境變數 `GOOGLE_CREDENTIALS_JSON`（整個 JSON 的內容，不需要 `credentials.json` 檔案）。

---

## 目錄結構

```
ticketing-system/
├── server.js               # Express 主程式
├── routes/
│   └── api.js              # API 路由（/api/event, /api/order）
├── utils/
│   └── sheets.js           # Google Sheets 整合
├── public/
│   └── index.html          # 前端（含購票流程＋票券產生）
├── package.json
├── .env                    # 環境變數（不進 git）
├── credentials.json        # 服務帳戶金鑰（不進 git）
└── README.md
```
