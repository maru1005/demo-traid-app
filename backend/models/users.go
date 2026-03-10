// backend/models/users.go
package models

type User struct {
	ID      uint    `json:"id" gorm:"primaryKey;autoIncrement"`
	Balance float64 `json:"balance"`
}
