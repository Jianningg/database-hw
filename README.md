# 茶序 Tea Query Lab

以手搖飲訂單為主題的互動式 SQL 查詢網站。提供案例背景、資料庫設計與七道查詢題目，可修改 SQL、執行查詢，並比較預期結果、實際結果與不同寫法的差異。

**網站：https://jianningg.github.io/database-hw/**

## 網站功能

- **案例背景**：說明店長、營運助理與顧客經營人員的需求，以一張訂單展示顧客、商品、訂單和明細的關係。
- **資料庫設計**：提供四張資料表的 ERD、主外鍵、欄位說明與樣本資料。
- **查詢操作**：各題提供問題、SQL 與預期結果；修改 SQL 後，可查看實際結果或 SQLite 錯誤訊息。
- **結果比較**：提供參考版與修改版，可並排執行並查看結果差異與原因。

## 查詢題目

| 題目 | SQL 重點 |
|---|---|
| 找出半糖、60 元內的飲品 | WHERE、AND、ORDER BY |
| 哪種口味最熱賣？ | JOIN、GROUP BY、SUM 與 COUNT |
| 哪種口味營收最高？ | 數量乘以成交單價、SUM、ROUND |
| 誰還沒下過訂單？ | LEFT JOIN、IS NULL |
| 每月的業績如何？ | 年月分組與跨年資料比較 |
| 哪種甜度最受歡迎？ | WHERE 與分組統計 |
| 找出高消費顧客 | HAVING、COUNT DISTINCT |

預期結果依目前資料集與參考 SQL 計算，修改編輯器不會改變預期值。結果依列順序比對數值，欄位別名不參與比對；相同結果不代表兩種 SQL 在所有資料上都等價。

## 資料庫設計

| 資料表 | 一列代表的資料 |
|---|---|
| `customers` | 一位顧客的基本資料 |
| `products` | 一種口味、甜度、配料與容量的商品組合 |
| `orders` | 一張訂單的日期與所屬顧客 |
| `order_items` | 一張訂單中的商品明細、數量與成交單價 |

顧客與訂單、訂單與明細、商品與明細皆為一對多關係。金額以整數分儲存，查詢時除以 `100.0` 換算為元；營收使用明細保存的成交單價。

## 資料來源

### 內附模擬資料

網站預設使用程式產生的虛構資料：100 位顧客、63 種商品組合、1,202 張訂單。金額單位為新臺幣，容量單位為 ml，不代表真實店家營運紀錄。

資料包含沒有下單的顧客，以及 2023、2024 年一月的訂單，供外連接與跨年分組比較使用。按年月分組可得到 13 列，僅按月份分組則為 12 列。

### 可匯入的外部資料

[Milk Tea Sales — williamjowens](https://github.com/williamjowens/excel-dashboard-milk-tea-sales)

原專案以 Faker 與隨機抽樣產生模擬資料，包含 1,000 位顧客、525 種商品組合、5,000 張訂單與 14,960 筆明細。本儲存庫不附原始 CSV；目前未確認其再散布授權。

可自行取得下列檔案，在網站「切換資料來源」中同時匯入：

- `customers_complete.csv`
- `products_complete.csv`
- `orders_complete.csv`

匯入資料保留原始 `$` 與 oz 單位，不換算為新臺幣或 ml。原始資料未提供歷史成交單價，匯入時以商品表單價建立明細價格，屬於本案例的資料處理假設。

CSV 僅在當次瀏覽器分頁記憶體中處理，不上傳伺服器。重新整理後會回到內附模擬資料。

## 執行方式

使用 Node.js 22 以上版本，在專案目錄執行：

```sh
npm ci
npm run dev
```

正式版本建置與預覽：

```sh
npm run build
npm run preview
```

開發伺服器預設使用 5173 埠，預覽伺服器預設使用 4173 埠。網站使用 SQL.js 在瀏覽器內執行 SQLite，不需要後端服務或資料庫帳密。

## 測試

```sh
npm test
```

測試涵蓋資料關聯、七題查詢、價格邊界、跨年分組、營收計算、唯讀限制、CSV 匯入與 SQL 草稿相容性。

啟動網站後，可另外執行瀏覽器測試：

```sh
npm run test:browser
```

瀏覽器測試需要 Chromium。可透過 `CHROMIUM_PATH` 指定執行檔、`TEA_TEST_URL` 指定測試網址；`TEA_SOURCE_DIR` 可指定外部 CSV 所在目錄，以測試資料匯入。

## 部署與查詢限制

GitHub Pages 透過 `.github/workflows/deploy.yml` 自動建置與部署，推送至 `main` 時會執行測試與建置。Pages 的發布來源需設定為 GitHub Actions。

SQL 在 Web Worker 中執行，資料庫為唯讀，每次接受一個 `SELECT` 或 `WITH` 查詢。查詢超過四秒會中止並重建資料庫，結果最多顯示 300 列。SQL 草稿儲存在使用者裝置的 localStorage。

## 授權

本專案程式與內附模擬資料採 [MIT License](LICENSE)。外部 Milk Tea Sales 資料不在本授權範圍。SQL.js 與 Vite 採 MIT 授權。
