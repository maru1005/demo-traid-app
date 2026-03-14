package services

import (
	"crypto-ai-app/database"
	"crypto-ai-app/models"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
)

var (
	lastFetchTime time.Time
	fetchMu       sync.RWMutex
	fetchInterval = 5 * time.Minute // 5分ごとに更新
)

// FetchAndStoreCoinsIfStale はキャッシュが古い場合のみCoinGeckoから取得してDBを更新します
func FetchAndStoreCoinsIfStale() error {
	fetchMu.RLock()
	needFetch := time.Since(lastFetchTime) > fetchInterval
	fetchMu.RUnlock()

	if !needFetch {
		return nil
	}

	fetchMu.Lock()
	// 二重チェック（別リクエストが先に更新した可能性）
	if time.Since(lastFetchTime) <= fetchInterval {
		fetchMu.Unlock()
		return nil
	}
	fetchMu.Unlock()

	err := fetchAndStoreCoins()
	if err != nil {
		return err
	}

	fetchMu.Lock()
	lastFetchTime = time.Now()
	fetchMu.Unlock()
	return nil
}

// fetchAndStoreCoins はCoinGeckoからデータを取得してDBに保存します（内部用）
func fetchAndStoreCoins() error {
	// 取得したい通貨のID（Figmaに合わせて主要なものを選定）
	ids := "bitcoin,ethereum,ripple,solana,dogecoin,cardano,polkadot,tron,chainlink,polygon"
	url := fmt.Sprintf("https://api.coingecko.com/api/v3/coins/markets?vs_currency=jpy&ids=%s&price_change_percentage=24h,7d,1y", ids)

	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var coins []models.Coin
	if err := json.NewDecoder(resp.Body).Decode(&coins); err != nil {
		return err
	}

	// DBに保存（存在すれば更新、なければ作成：Upsert）
	for _, coin := range coins {
		database.DB.Save(&coin)
	}

	return nil
}

// FetchCurrentPrices は複数コインの現在価格をCoinGeckoから一括取得します
// coinIDs: ["bitcoin", "ethereum", ...]
// 戻り値: map[coin_id]current_price
func FetchCurrentPrices(coinIDs []string) (map[string]float64, error) {
	ids := ""
	for i, id := range coinIDs {
		if i > 0 {
			ids += ","
		}
		ids += id
	}
	url := fmt.Sprintf(
		"https://api.coingecko.com/api/v3/simple/price?ids=%s&vs_currencies=jpy",
		ids,
	)

	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// レスポンス例: {"bitcoin":{"jpy":9000000}, "ethereum":{"jpy":400000}}
	var result map[string]map[string]float64
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	prices := make(map[string]float64)
	for coinID, currencies := range result {
		prices[coinID] = currencies["jpy"]
	}
	return prices, nil
}

// FetchPriceHistory はCoinGeckoから価格履歴を取得します
// days: 1(24時間), 7(7日間), 365(1年間)
func FetchPriceHistory(coinID string, days int) ([]map[string]interface{}, error) {
	if days <= 0 {
		days = 365
	}
	url := fmt.Sprintf(
		"https://api.coingecko.com/api/v3/coins/%s/market_chart?vs_currency=jpy&days=%d",
		coinID, days,
	)

	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Prices [][]float64 `json:"prices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	// [ [タイムスタンプ, 価格], ... ] を [{date, price}] に変換
	// days=1(24h)の場合は時刻を含める（同一日が複数あるため）
	dateFormat := "2006/01/02"
	if days == 1 {
		dateFormat = "01/02 15:04"
	}
	history := make([]map[string]interface{}, len(result.Prices))
	for i, p := range result.Prices {
		timestamp := int64(p[0]) / 1000
		t := time.Unix(timestamp, 0)
		history[i] = map[string]interface{}{
			"date":  t.Format(dateFormat),
			"price": p[1],
		}
	}

	return history, nil
}
