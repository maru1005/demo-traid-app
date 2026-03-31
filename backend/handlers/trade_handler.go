// backend/handlers/trade_handler.go
package handlers

import (
	"crypto-ai-app/models"
	"crypto-ai-app/services"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

// 買う
func BuyCoin(c *gin.Context) {
	authID, ok := getAuthID(c)
	if !ok {
		return
	}
	user, err := services.GetUserByAuthID(authID)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ユーザーが登録されていません。初期残高を設定してください。"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー情報の取得に失敗しました"})
		return
	}

	var req struct {
		CoinID   string  `json:"coin_id"`
		CoinName string  `json:"coin_name"`
		Amount   float64 `json:"amount"`
		Price    float64 `json:"price"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストが不正です"})
		return
	}

	// 1. 基本的な入力バリデーションはServiceを呼ぶ前に行う
	if req.CoinID == "" || req.Amount <= 0 || req.Price <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストが不正です"})
		return
	}

	err = services.BuyCoin(user.ID, req.CoinID, req.CoinName, req.Amount, req.Price)

	if err != nil {
		// 2. Serviceからのビジネスロジックエラーをハンドリング
		if errors.Is(err, services.ErrInsufficientBalance) || errors.Is(err, services.ErrInvalidInput) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "取引に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "購入しました"})
}

// 売る
func SellCoin(c *gin.Context) {
	authID, ok := getAuthID(c)
	if !ok {
		return
	}
	user, err := services.GetUserByAuthID(authID)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ユーザーが登録されていません。"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー情報の取得に失敗しました"})
		return
	}

	var req struct {
		CoinID   string  `json:"coin_id"`
		CoinName string  `json:"coin_name"`
		Amount   float64 `json:"amount"`
		Price    float64 `json:"price"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストが不正です"})
		return
	}

	if req.CoinID == "" || req.Amount <= 0 || req.Price <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストが不正です"})
		return
	}

	err = services.SellCoin(user.ID, req.CoinID, req.CoinName, req.Amount, req.Price)

	if err != nil {
		if errors.Is(err, services.ErrHoldingNotFound) || errors.Is(err, services.ErrInsufficientHolding) || errors.Is(err, services.ErrInvalidInput) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "取引に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "売却しました"})
}

// 保有残高一覧
func GetHoldings(c *gin.Context) {
	authID, ok := getAuthID(c)
	if !ok {
		return
	}
	user, err := services.GetUserByAuthID(authID)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			c.JSON(http.StatusOK, []models.Holding{})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー情報の取得に失敗しました"})
		return
	}

	holdings, err := services.GetHoldings(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保有データの取得に失敗しました"})
		return
	}
	c.JSON(http.StatusOK, holdings)
}

// 取引履歴一覧
func GetTrades(c *gin.Context) {
	authID, ok := getAuthID(c)
	if !ok {
		return
	}
	user, err := services.GetUserByAuthID(authID)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			c.JSON(http.StatusOK, []models.Trade{})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー情報の取得に失敗しました"})
		return
	}

	trades, err := services.GetTrades(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "取引履歴の取得に失敗しました"})
		return
	}
	c.JSON(http.StatusOK, trades)
}

// 損益一覧
func GetHoldingsPnL(c *gin.Context) {
	authID, ok := getAuthID(c)
	if !ok {
		return
	}
	user, err := services.GetUserByAuthID(authID)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			c.JSON(http.StatusOK, []services.HoldingPnL{})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー情報の取得に失敗しました"})
		return
	}

	result, err := services.CalculateHoldingsPnL(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "データの取得に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetTargetPnL はフロントエンドから渡された価格に基づき、損益シミュレーション結果を返します
// 外部APIを叩かないため、高速に動作し、任意の価格（目標価格）での計算が可能です
func GetTargetPnL(c *gin.Context) {
	authID, ok := getAuthID(c)
	if !ok {
		return
	}
	user, err := services.GetUserByAuthID(authID)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			c.JSON(http.StatusOK, []services.HoldingPnL{})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー情報の取得に失敗しました"})
		return
	}

	var req struct {
		Prices map[string]float64 `json:"prices"` // {"bitcoin": 10000000, ...}
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストが不正です"})
		return
	}

	result, err := services.CalculateCustomPnL(user.ID, req.Prices)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "計算に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, result)
}
