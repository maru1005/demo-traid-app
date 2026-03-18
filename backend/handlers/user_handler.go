// backend/handlers/user_handler.go
package handlers

import (
	"crypto-ai-app/database"
	"crypto-ai-app/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

// auth_idをcontextから取得するヘルパー
func getAuthID(c *gin.Context) (string, bool) {
	authID, exists := c.Get("auth_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証情報が見つかりません"})
		return "", false
	}
	return authID.(string), true
}

// 残高取得
func GetUser(c *gin.Context) {
	authID, ok := getAuthID(c)
	if !ok {
		return
	}

	var user models.User
	if database.DB.Where("auth_id = ?", authID).First(&user).Error != nil {
		// 未登録の場合は空を返す（404じゃなく200）
		c.JSON(http.StatusOK, nil)
		return
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
	var existing models.User
	if database.DB.Where("auth_id = ?", authID).First(&existing).Error == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "すでに初期化済みです"})
		return
	}

	user := models.User{AuthID: authID, Balance: req.Balance}
	database.DB.Create(&user)
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

	var user models.User
	if database.DB.Where("auth_id = ?", authID).First(&user).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
		return
	}

	database.DB.Model(&user).Update("balance", user.Balance+req.Amount)
	c.JSON(http.StatusOK, user)
}
