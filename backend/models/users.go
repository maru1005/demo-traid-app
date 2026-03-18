// backend/models/users.go
package models

type User struct {
	ID      uint    `json:"id" gorm:"primaryKey;autoIncrement"`
	AuthID  string  `json:"auth_id" gorm:"uniqueIndex"`
	Balance float64 `json:"balance"`
}
