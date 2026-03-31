// backend/servise/user_service.go
package services

import (
	"crypto-ai-app/database"
	"crypto-ai-app/models"
	"errors"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Add user-specific sentinel errors
var (
	ErrUserAlreadyExists = errors.New("すでに初期化済みです")
	ErrUserNotFound      = errors.New("ユーザーが見つかりません")
)

// GetUserByAuthID finds a user by their authentication ID.
func GetUserByAuthID(authID string) (*models.User, error) {
	var user models.User
	err := database.DB.Where("auth_id = ?", authID).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err // Other DB errors
	}
	return &user, nil
}

// InitUser creates a new user with an initial balance.
func InitUser(authID string, balance float64) (*models.User, error) {
	// Check if user already exists
	_, err := GetUserByAuthID(authID)
	if err == nil {
		return nil, ErrUserAlreadyExists // User found, so they exist
	}
	if !errors.Is(err, ErrUserNotFound) {
		return nil, err // A different error occurred
	}

	// User does not exist, so create them
	user := models.User{AuthID: authID, Balance: balance}
	if err := database.DB.Create(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// Deposit adds funds to a user's balance and returns the updated user.
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
		return tx.Save(&user).Error
	})
	if err != nil {
		return nil, err
	}
	return &user, nil
}
