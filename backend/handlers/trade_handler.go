// backend/handlers/trade_handler.go
package handlers

import (
	"crypto-ai-app/models"
	"crypto-ai-app/services"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

// StartSession はオンボーディング・リセット共通のセッション開始ハンドラー
func StartSession(c *gin.Context) {
	authID, ok := getAuthID(c)
	if !ok {
		return
	}

	// ユーザーが存在しない場合は新規作成
	user, err := services.GetUserByAuthID(authID)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			// 初回ログイン：usersテーブルにレコードを作成
			newUser, createErr := services.InitUser(authID, 0)
			if createErr != nil && !errors.Is(createErr, services.ErrUserAlreadyExists) {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー作成に失敗しました"})
				return
			}
			if newUser != nil {
				user = newUser
			} else {
				user, err = services.GetUserByAuthID(authID)
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー情報の取得に失敗しました"})
					return
				}
			}
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー情報の取得に失敗しました"})
			return
		}
	}

	var req struct {
		InitialBalance float64 `json:"initial_balance"`
		TargetPnL      float64 `json:"target_pnl"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.InitialBalance <= 0 || req.TargetPnL <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "初期残高・目標損益を正しく入力してください"})
		return
	}

	if err := services.StartSession(user.ID, req.InitialBalance, req.TargetPnL); err != nil {
		if errors.Is(err, services.ErrInvalidInput) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "セッション開始に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "セッションを開始しました"})
}

// ResetSession はセッションをリセットして新セッションを開始するハンドラー
func ResetSession(c *gin.Context) {
	authID, ok := getAuthID(c)
	if !ok {
		return
	}
	user, err := services.GetUserByAuthID(authID)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ユーザーが登録されていません"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー情報の取得に失敗しました"})
		return
	}

	var req struct {
		InitialBalance float64 `json:"initial_balance"`
		TargetPnL      float64 `json:"target_pnl"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.InitialBalance <= 0 || req.TargetPnL <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "初期残高・目標損益を正しく入力してください"})
		return
	}

	if err := services.ResetSession(user.ID, req.InitialBalance, req.TargetPnL); err != nil {
		if errors.Is(err, services.ErrInvalidInput) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "リセットに失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "リセットしました"})
}

// BuyCoin 買う
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

	if req.CoinID == "" || req.Amount <= 0 || req.Price <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストが不正です"})
		return
	}

	if err := services.BuyCoin(user.ID, req.CoinID, req.CoinName, req.Amount, req.Price); err != nil {
		if errors.Is(err, services.ErrInsufficientBalance) || errors.Is(err, services.ErrInvalidInput) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "取引に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "購入しました"})
}

// SellCoin 売る
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

	if err := services.SellCoin(user.ID, req.CoinID, req.CoinName, req.Amount, req.Price); err != nil {
		if errors.Is(err, services.ErrHoldingNotFound) || errors.Is(err, services.ErrInsufficientHolding) || errors.Is(err, services.ErrInvalidInput) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "取引に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "売却しました"})
}

// GetHoldings 保有残高一覧
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

// GetTrades 取引履歴一覧
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

// GetHoldingsPnL 損益一覧
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

// GetTargetPnL 損益シミュレーション
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
		Prices map[string]float64 `json:"prices"`
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

// UpdateTarget は目標損益のみ更新するハンドラー
func UpdateTarget(c *gin.Context) {
	authID, ok := getAuthID(c)
	if !ok {
		return
	}
	user, err := services.GetUserByAuthID(authID)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ユーザーが登録されていません"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー情報の取得に失敗しました"})
		return
	}

	var req struct {
		TargetPnL float64 `json:"target_pnl"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.TargetPnL <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "目標損益を正しく入力してください"})
		return
	}

	if err := services.UpdateTarget(user.ID, req.TargetPnL); err != nil {
		if errors.Is(err, services.ErrInvalidInput) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "目標更新に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "目標を更新しました"})
}
