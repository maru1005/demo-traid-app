````
crypto-ai-app/
├── docker-compose.yml     # DB等のインフラ定義
├── .gitignore             # 全体で無視するファイル
├── backend/               # Go API
│   ├── main.go            # エントリポイント（起動口）
│   ├── .env               # DBやGeminiのキー（Git管理外）
│   ├── go.mod
│   ├── go.sum
│   ├── handlers/          # APIの窓口（リクエストを受けてレスポンスを返す）
│   │   └── coin_handler.go
│   ├── services/          # ビジネスロジック（CoinGeckoやGeminiとの通信）
│   │   ├── coingecko.go
│   │   └── gemini.go
│   ├── models/            # データの構造体（DBのテーブル定義など）
│   │   └── coin.go
│   └── database/          # DB接続設定
│       └── db.go
└── frontend/              # Next.js (App Router)
    src/
 ├── app/
 │    └── page.tsx           # データの取得と全体のレイアウト
 └── components/
      ├── CoinList.tsx       # リスト全体の管理
      ├── CoinCard.tsx       # 各通貨の行（ここでAI分析ボタンを置く）
      └── AnalysisModal.tsx  # AIの回答をふわっと出す画面（またはアコーディオン）
    ```
````
