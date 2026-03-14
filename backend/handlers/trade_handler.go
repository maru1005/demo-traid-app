// backend/handlers/trade_handler.go
package handlers

import (
	"crypto-ai-app/database"
	"crypto-ai-app/models"
	"crypto-ai-app/services"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// 買う
func BuyCoin(c *gin.Context) {
	var req struct {
		CoinID   string  `json:"coin_id"`
		CoinName string  `json:"coin_name"`
		Amount   float64 `json:"amount"` // 購入数量
		Price    float64 `json:"price"`  // 現在価格
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストが不正です"})
		return
	}

	total := req.Amount * req.Price

	// 残高チェック
	var user models.User
	if database.DB.First(&user).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
		return
	}
	if user.Balance < total {
		c.JSON(http.StatusBadRequest, gin.H{"error": "残高が不足しています"})
		return
	}

	// 残高を減らす
	database.DB.Model(&user).Update("balance", user.Balance-total)

	// 保有残高を更新
	var holding models.Holding
	result := database.DB.Where("coin_id = ?", req.CoinID).First(&holding)
	if result.Error != nil {
		// 新規保有
		holding = models.Holding{
			CoinID:   req.CoinID,
			CoinName: req.CoinName,
			Amount:   req.Amount,
			AvgPrice: req.Price,
		}
		database.DB.Create(&holding)
	} else {
		// 平均取得価格を更新
		totalAmount := holding.Amount + req.Amount
		avgPrice := (holding.Amount*holding.AvgPrice + req.Amount*req.Price) / totalAmount
		database.DB.Model(&holding).Updates(map[string]interface{}{
			"amount":    totalAmount,
			"avg_price": avgPrice,
		})
	}

	// 取引履歴に追加
	trade := models.Trade{
		CoinID:    req.CoinID,
		CoinName:  req.CoinName,
		Type:      "buy",
		Amount:    req.Amount,
		Price:     req.Price,
		Total:     total,
		CreatedAt: time.Now(),
	}
	database.DB.Create(&trade)

	c.JSON(http.StatusOK, gin.H{"message": "購入しました", "balance": user.Balance - total})
}

// 売る
func SellCoin(c *gin.Context) {
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

	// 保有チェック
	var holding models.Holding
	if database.DB.Where("coin_id = ?", req.CoinID).First(&holding).Error != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "保有していません"})
		return
	}
	if holding.Amount < req.Amount {
		c.JSON(http.StatusBadRequest, gin.H{"error": "保有数量が不足しています"})
		return
	}

	total := req.Amount * req.Price

	// 残高を増やす
	var user models.User
	database.DB.First(&user)
	database.DB.Model(&user).Update("balance", user.Balance+total)

	// 保有残高を更新
	newAmount := holding.Amount - req.Amount
	if newAmount == 0 {
		database.DB.Delete(&holding)
	} else {
		database.DB.Model(&holding).Update("amount", newAmount)
	}

	// 取引履歴に追加
	trade := models.Trade{
		CoinID:    req.CoinID,
		CoinName:  req.CoinName,
		Type:      "sell",
		Amount:    req.Amount,
		Price:     req.Price,
		Total:     total,
		CreatedAt: time.Now(),
	}
	database.DB.Create(&trade)

	c.JSON(http.StatusOK, gin.H{"message": "売却しました", "balance": user.Balance + total})
}

// 保有残高一覧
func GetHoldings(c *gin.Context) {
	var holdings []models.Holding
	database.DB.Find(&holdings)
	c.JSON(http.StatusOK, holdings)
}

// 取引履歴一覧
func GetTrades(c *gin.Context) {
	var trades []models.Trade
	database.DB.Order("created_at desc").Find(&trades)
	c.JSON(http.StatusOK, trades)
}

// 損益一覧
type HoldingPnL struct {
	CoinID       string  `json:"coin_id"`
	CoinName     string  `json:"coin_name"`
	Amount       float64 `json:"amount"`
	AvgPrice     float64 `json:"avg_price"`
	CurrentPrice float64 `json:"current_price"`
	Pnl          float64 `json:"pnl"`
	PnlPercent   float64 `json:"pnl_percent"`
}

func GetHoldingsPnL(c *gin.Context) {
	var holdings []models.Holding
	if err := database.DB.Find(&holdings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保有データの取得に失敗しました"})
		return
	}
	if len(holdings) == 0 {
		c.JSON(http.StatusOK, []HoldingPnL{})
		return
	}

	// coin_id一覧を作成
	coinIDs := make([]string, len(holdings))
	for i, h := range holdings {
		coinIDs[i] = h.CoinID
	}

	// CoinGeckoから現在価格を一括取得
	prices, err := services.FetchCurrentPrices(coinIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "現在価格の取得に失敗しました"})
		return
	}

	// 損益計算
	result := make([]HoldingPnL, 0, len(holdings))
	for _, h := range holdings {
		currentPrice := prices[h.CoinID]
		pnl := (currentPrice - h.AvgPrice) * h.Amount
		pnlPercent := 0.0
		if h.AvgPrice > 0 {
			pnlPercent = (currentPrice - h.AvgPrice) / h.AvgPrice * 100
		}
		result = append(result, HoldingPnL{
			CoinID:       h.CoinID,
			CoinName:     h.CoinName,
			Amount:       h.Amount,
			AvgPrice:     h.AvgPrice,
			CurrentPrice: currentPrice,
			Pnl:          pnl,
			PnlPercent:   pnlPercent,
		})
	}

	c.JSON(http.StatusOK, result)
}
