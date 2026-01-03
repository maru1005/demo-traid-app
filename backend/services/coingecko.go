package services

import (
	"crypto-ai-app/database"
	"crypto-ai-app/models"
	"encoding/json"
	"fmt"
	"net/http"
)

// FetchAndStoreCoins はCoinGeckoからデータを取得してDBに保存します
func FetchAndStoreCoins() error {
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
