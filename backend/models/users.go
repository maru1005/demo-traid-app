// backend/models/users.go
package models

type User struct {
	ID             uint    `json:"id" gorm:"primaryKey;autoIncrement"`
	AuthID         string  `json:"auth_id" gorm:"uniqueIndex"`
	Balance        float64 `json:"balance"`
	InitialBalance float64 `json:"initial_balance"`
	TargetPnL      float64 `json:"target_pnl" gorm:"column:target_pnl"`
	SessionID      uint    `json:"session_id"`
}
