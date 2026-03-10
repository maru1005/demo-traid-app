// backend/models/coin.go
package models

type Coin struct {
	ID            string  `json:"id" gorm:"primaryKey"`
	Symbol        string  `json:"symbol"`
	Name          string  `json:"name"`
	Image         string  `json:"image"`
	CurrentPrice  float64 `json:"current_price"`
	MarketCap     float64 `json:"market_cap"`
	MarketCapRank int     `json:"market_cap_rank"`
	Change24h     float64 `json:"price_change_percentage_24h" gorm:"column:change_24h"`
	Change7d      float64 `json:"price_change_percentage_7d_in_currency" gorm:"column:change_7d"`
	Change1y      float64 `json:"price_change_percentage_1y_in_currency" gorm:"column:change_1y"`
}
