// backend/handlers/user_handler.go
package handlers

import (
	"crypto-ai-app/services"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetUser はユーザー情報と累計入金額を返す
func GetUser(c *gin.Context) {
	authID, ok := getAuthID(c)
	if !ok {
		return
	}

	stats, err := services.GetUserWithStats(authID)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			c.JSON(http.StatusOK, nil)
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー取得に失敗しました"})
		return
	}
	c.JSON(http.StatusOK, stats)
}

// InitUser は初回ユーザー作成
func InitUser(c *gin.Context) {
	authID, ok := getAuthID(c)
	if !ok {
		return
	}

	var req struct {
		Balance float64 `json:"balance"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Balance <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "金額が不正です"})
		return
	}

	user, err := services.InitUser(authID, req.Balance)
	if err != nil {
		if errors.Is(err, services.ErrUserAlreadyExists) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー作成に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// Deposit は入金処理
func Deposit(c *gin.Context) {
	authID, ok := getAuthID(c)
	if !ok {
		return
	}

	var req struct {
		Amount float64 `json:"amount"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "金額が不正です"})
		return
	}

	user, err := services.Deposit(authID, req.Amount)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "資金追加に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, user)
}
