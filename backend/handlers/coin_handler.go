package handlers

import (
	"crypto-ai-app/database"
	"crypto-ai-app/models"
	"crypto-ai-app/services"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// 1. コイン一覧取得
func GetCoins(c *gin.Context) {
	// キャッシュが古い場合のみCoinGeckoから取得（5分間はDBのデータを使用）
	if err := services.FetchAndStoreCoinsIfStale(); err != nil {
		fmt.Println("Fetch error:", err)
		// 取得失敗時もDBに既存データがあれば返す
	}

	var coins []models.Coin
	// DBからデータを取得して coins に入れる
	if err := database.DB.Find(&coins).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB取得失敗"})
		return
	}

	c.JSON(http.StatusOK, coins)
}

// 2. AI分析ハンドラー
func AnalyzeCoin(c *gin.Context) {
	name := c.Query("name")
	price, _ := strconv.ParseFloat(c.Query("price"), 64)
	change, _ := strconv.ParseFloat(c.Query("change"), 64)
	tradeType := c.Query("trade_type")

	params := services.AnalysisParams{
		CoinName:  name,
		Price:     price,
		Change24h: change,
		TradeType: tradeType,
	}

	if v, err := strconv.ParseFloat(c.Query("balance"), 64); err == nil {
		params.Balance = v
	}
	if v, err := strconv.ParseFloat(c.Query("remaining"), 64); err == nil {
		params.Remaining = v
	}
	if v, err := strconv.ParseFloat(c.Query("change_7d"), 64); err == nil {
		params.Change7d = v
	}
	if v, err := strconv.ParseFloat(c.Query("change_1y"), 64); err == nil {
		params.Change1y = v
	}
	if v, err := strconv.ParseFloat(c.Query("holding_amount"), 64); err == nil {
		params.HoldingAmount = &v
	}
	if v, err := strconv.ParseFloat(c.Query("avg_price"), 64); err == nil {
		params.AvgPrice = &v
	}
	if v, err := strconv.ParseFloat(c.Query("pnl"), 64); err == nil {
		params.PnL = &v
	}

	analysis, err := services.GetAIAnalysis(params)
	if err != nil {
		fmt.Println("--------------------------------------------------")
		fmt.Printf("🚨 GEMINI SERVICE ERROR: %v\n", err)
		fmt.Println("--------------------------------------------------")

		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"analysis": analysis})
}

// 3. 価格履歴取得ハンドラー
func GetPriceHistory(c *gin.Context) {
	coinID := c.Query("id")
	if coinID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "idが必要です"})
		return
	}

	days := 365 // デフォルト1年
	if daysStr := c.Query("days"); daysStr != "" {
		if d, err := strconv.Atoi(daysStr); err == nil && (d == 1 || d == 7 || d == 365) {
			days = d
		}
	}

	history, err := services.FetchPriceHistory(coinID, days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, history)
}
