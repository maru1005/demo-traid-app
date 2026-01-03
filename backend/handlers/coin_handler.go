package handlers

import (
	"crypto-ai-app/database" // 👈 あなたのDBパッケージ
	"crypto-ai-app/models"
	"crypto-ai-app/services"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// 1. コイン一覧取得（ここを修正しました！）
func GetCoins(c *gin.Context) {
	// 最新データを取得してDBを更新（もし必要なら）
	if err := services.FetchAndStoreCoins(); err != nil {
		fmt.Println("Fetch error:", err)
	}

	var coins []models.Coin
	// DBからデータを取得して coins に入れる
	if err := database.DB.Find(&coins).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB取得失敗"})
		return
	}

	c.JSON(http.StatusOK, coins)
}

// 2. AI分析ハンドラー（ここは先ほどと同じです）
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
