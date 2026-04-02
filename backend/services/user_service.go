// backend/services/user_service.go
package services

import (
	"crypto-ai-app/database"
	"crypto-ai-app/models"
	"errors"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrUserAlreadyExists = errors.New("すでに初期化済みです")
	ErrUserNotFound      = errors.New("ユーザーが見つかりません")
)

// UserWithStats はフロントに返すユーザー情報（累計入金額付き）
type UserWithStats struct {
	ID             uint    `json:"id"`
	Balance        float64 `json:"balance"`
	InitialBalance float64 `json:"initial_balance"`
	TargetPnL      float64 `json:"target_pnl"`
	SessionID      uint    `json:"session_id"`
	TotalDeposited float64 `json:"total_deposited"` // 現セッションの累計入金額
}

func GetUserByAuthID(authID string) (*models.User, error) {
	var user models.User
	err := database.DB.Where("auth_id = ?", authID).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

// GetUserWithStats はユーザー情報と現セッションの累計入金額を返す
func GetUserWithStats(authID string) (*UserWithStats, error) {
	user, err := GetUserByAuthID(authID)
	if err != nil {
		return nil, err
	}

	// 現セッションのdepositレコードを合算
	var totalDeposited float64
	if err := database.DB.Model(&models.Trade{}).
		Where("user_id = ? AND session_id = ? AND type = ?", user.ID, user.SessionID, "deposit").
		Select("COALESCE(SUM(total), 0)").
		Scan(&totalDeposited).Error; err != nil {
		return nil, err
	}

	return &UserWithStats{
		ID:             user.ID,
		Balance:        user.Balance,
		InitialBalance: user.InitialBalance,
		TargetPnL:      user.TargetPnL,
		SessionID:      user.SessionID,
		TotalDeposited: totalDeposited,
	}, nil
}

func InitUser(authID string, balance float64) (*models.User, error) {
	_, err := GetUserByAuthID(authID)
	if err == nil {
		return nil, ErrUserAlreadyExists
	}
	if !errors.Is(err, ErrUserNotFound) {
		return nil, err
	}

	user := models.User{AuthID: authID, Balance: balance}
	if err := database.DB.Create(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// Deposit は残高を更新しつつdepositレコードを履歴に残す
func Deposit(authID string, amount float64) (*models.User, error) {
	var user models.User
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("auth_id = ?", authID).First(&user).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrUserNotFound
			}
			return err
		}

		user.Balance += amount
		if err := tx.Save(&user).Error; err != nil {
			return err
		}

		// depositレコードを履歴に追加
		deposit := models.Trade{
			UserID:    user.ID,
			SessionID: user.SessionID,
			CoinID:    "deposit",
			CoinName:  "入金",
			Type:      "deposit",
			Amount:    1,
			Price:     amount,
			Total:     amount,
			CreatedAt: time.Now(),
		}
		return tx.Create(&deposit).Error
	})
	if err != nil {
		return nil, err
	}
	return &user, nil
}
