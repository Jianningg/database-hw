# 茶序 Tea Query Lab

手搖飲訂單分析：互動式 SQL 查詢練習。繁體中文靜態網站，使用 SQL.js 在瀏覽器內執行真正的 SQLite 查詢，可部署至 GitHub Pages。

## 開發

Node.js 22 以上，使用既有 checkout，不需建立 worktree。

```sh
npm ci --cache /workspace/.npm-cache
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

預設 Vite 開發埠為 5173，預覽埠為 4173。若已占用，Vite 會選擇下一個埠；以輸出為準。沒有後端服務、環境變數或資料庫密碼需求。

## 作業需求

- 案例背景：面向飲料店長、營運助理與顧客經營人員，說明各表一列的意義、資料規則及分析限制；以目前資料集的一張實際訂單展示關聯、明細筆數、杯數與金額，並提供對應練習入口。
- 資料庫設計：四張表的 ERD、主外鍵、欄位說明與目前資料的樣本。
- 查詢操作：七道問題、可修改 SQL、實際結果或 SQLite 錯誤。預期結果於資料庫建立時以參考 SQL 計算，切題時直接顯示並與實際結果並排；手機依序顯示。修改 SQL 不會改變預期值，切換資料集則同步更新預期值與案例。
- 結果比較：參考與修改版並排執行，解釋 COUNT/SUM、INNER/LEFT JOIN、跨年分組與 COUNT DISTINCT。

查詢結果與參考值依列順序比對，欄位別名不參與比對；相同結果不表示 SQL 在任何資料上都等價。完成進度僅計當次頁面，SQL 草稿儲存在 localStorage。

## 資料與授權

已選定的外部資料：
https://github.com/williamjowens/excel-dashboard-milk-tea-sales

這是作者以 Faker 與隨機抽樣產生的合成資料，不代表真實店家營運。原專案未找到明確再散布授權；本專案**沒有收錄原始 CSV**。預設提供本作品獨立產生的虛構示範資料（`src/data.js`），可在尚未確認外部資料授權時公開展示。

原始資料共 1,000 位顧客、525 種商品、5,000 張訂單與 14,960 筆明細。若已自行取得檔案，可在網站右側「切換資料來源」同時選取：

- `customers_complete.csv`
- `products_complete.csv`
- `orders_complete.csv`

檔案只在當次瀏覽器分頁記憶體處理，不上傳、不寫入 localStorage。重新整理回到示範資料。原檔可從來源專案的 `data/raw` 目錄取得。公開內附原資料前請先確認作者授權。

兩種資料集的單位不同：示範資料為 NT$ / ml；原始資料保留 $ / oz，不將 $ 直接標為新臺幣。金額使用整數分儲存，顯示查詢除以 100.0。原資料沒有歷史成交價，因此匯入時以商品表價格建立明細成交價，此為明示的教學假設。

## 查詢保護

SQL.js 在 Web Worker 執行，SQLite `query_only` 保護資料；每次接受一個 SELECT/WITH，超過四秒會終止 worker 並恢復目前資料集。每次顯示最多 300 列；超出時明確提示。這是教學工具，並非供不受信任的程式使用的完整安全沙箱。

## GitHub Pages

已附 `.github/workflows/deploy.yml`。正式部署步驟：

1. 將專案提交並推送至 `main`。
2. 到 GitHub repository → Settings → Pages → Build and deployment，Source 選 **GitHub Actions**。
3. 確認 Actions 的部署工作成功，使用其輸出的實際網站網址。

Vite 使用相對路徑 `base: './'`，支援 `/database-hw/` 子路徑。請勿在 Actions 完成前將預期網址當成已部署網址。本專案不會自動寄信給助教。

## 驗證

`npm test` 驗證資料關聯、七題兩種版本的 SQL、杯數與營收總額、唯讀限制、顯示上限、CSV 解析與錯誤資料拒絕。

啟動網站後，可執行 `npm run test:browser`，以系統 `/usr/bin/chromium` 驗證七道練習、錯誤訊息、查詢超時恢復、導覽與手機版面。可透過 `CHROMIUM_PATH` 指定瀏覽器、`TEA_TEST_URL` 指定測試網址，並以 `TEA_SOURCE_DIR` 指定本機三個原始 CSV 的目錄來額外驗證匯入。測試截圖存於 `/tmp/tea-query-lab/`，不加入儲存庫。

本作品程式與原創示範資料採 MIT 授權；外部 Milk Tea Sales 資料不在本授權範圍。SQL.js 與 Vite 採 MIT 授權。

七題依序包含：商品條件篩選、口味銷量、口味營收、未下單顧客、跨年月營收、甜度分布與顧客消費。示範資料保留原有 1,200 張訂單，另外加入 2023-01-15 與 2024-01-15 各一張教學訂單；按年月分組為 13 列，按月份分組為 12 列，一月金額會合併。SQL 草稿改以固定題目 ID 保存，舊版以索引保存的六題草稿會對應到原題目。
