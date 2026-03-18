// backend/models/trade.go
package models

import "time"

type Trade struct {
	ID        uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID    uint      `json:"user_id"`
	CoinID    string    `json:"coin_id"`
	CoinName  string    `json:"coin_name"`
	Type      string    `json:"type"` // "buy" or "sell"
	Amount    float64   `json:"amount"`
	Price     float64   `json:"price"`
	Total     float64   `json:"total"`
	CreatedAt time.Time `json:"created_at"`
}
