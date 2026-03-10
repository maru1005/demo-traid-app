// backend/handlers/user_handler.go
package handlers

import (
	"crypto-ai-app/database"
	"crypto-ai-app/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

// 残高取得
func GetUser(c *gin.Context) {
	var user models.User
	result := database.DB.First(&user)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
		return
	}
	c.JSON(http.StatusOK, user)
}

// 初期残高設定
func InitUser(c *gin.Context) {
	var req struct {
		Balance float64 `json:"balance"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Balance <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "金額が不正です"})
		return
	}

	// すでに存在する場合は作成しない
	var existing models.User
	if database.DB.First(&existing).Error == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "すでに初期化済みです"})
		return
	}

	user := models.User{Balance: req.Balance}
	database.DB.Create(&user)
	c.JSON(http.StatusOK, user)
}

// 資金追加
func Deposit(c *gin.Context) {
	var req struct {
		Amount float64 `json:"amount"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "金額が不正です"})
		return
	}

	var user models.User
	if database.DB.First(&user).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
		return
	}

	database.DB.Model(&user).Update("balance", user.Balance+req.Amount)
	c.JSON(http.StatusOK, user)
}
