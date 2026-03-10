// backend/models/holding.go
package models

type Holding struct {
	ID       uint    `json:"id" gorm:"primaryKey;autoIncrement"`
	CoinID   string  `json:"coin_id"`
	CoinName string  `json:"coin_name"`
	Amount   float64 `json:"amount"`
	AvgPrice float64 `json:"avg_price"`
}
