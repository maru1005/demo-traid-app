// backend/handlers/user_handler.go
package handlers

import (
	"crypto-ai-app/services"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

// 残高取得
func GetUser(c *gin.Context) {
	authID, ok := getAuthID(c)
	if !ok {
		return
	}

	user, err := services.GetUserByAuthID(authID)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			c.JSON(http.StatusOK, nil) // Not found is not an error for this endpoint
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー取得に失敗しました"})
	}
	c.JSON(http.StatusOK, user)
}

// 初期残高設定
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

	// すでに存在する場合は作成しない
	user, err := services.InitUser(authID, req.Balance)
	if err != nil {
		if errors.Is(err, services.ErrUserAlreadyExists) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー作成に失敗しました"})
	}

	c.JSON(http.StatusOK, user)
}

// 資金追加
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
	}

	c.JSON(http.StatusOK, user)
}
