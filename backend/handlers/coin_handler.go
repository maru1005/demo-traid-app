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
	priceStr := c.Query("price")
	changeStr := c.Query("change")

	price, _ := strconv.ParseFloat(priceStr, 64)
	change, _ := strconv.ParseFloat(changeStr, 64)

	analysis, err := services.GetAIAnalysis(name, price, change)
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
